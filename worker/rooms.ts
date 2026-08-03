import { generateRouteCourses } from './recommendations';
import type { SearchCredentials } from './recommendations';

export const ROOM_TTL_SECONDS = 7 * 24 * 60 * 60;
export const roomExpiresAt = (createdAt: number) => createdAt + ROOM_TTL_SECONDS;
const COLORS = ['#ff6b4a', '#3f7cff', '#9b6bdf', '#18a778', '#e69524', '#d24b78'];

type RoomRow = {
  id: string; name: string; origin: string; destination: string; start_date: string; end_date: string;
  transport: string; stay: string; expected_members: number; vote_round: number; runoff_course_ids: string;
  final_course_id: string | null; recommendation_json: string | null; itinerary_json: string | null; created_at: number; expires_at: number;
};

type MemberRow = {
  id: string; room_id: string; name: string; color: string; is_host: number;
  token_hash: string; preference_json: string | null; created_at: number;
};

type VoteRow = { member_id: string; course_id: string; round: number };

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readBody(request: Request) {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomRoomId() {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 10);
}

async function activeRoom(db: D1Database, id: string) {
  const room = await db.prepare('SELECT * FROM rooms WHERE id = ?1').bind(id).first<RoomRow>();
  if (!room) return { error: json({ error: '여행방을 찾을 수 없습니다.' }, 404) };
  if (room.expires_at <= Math.floor(Date.now() / 1000)) return { error: json({ error: '이 여행방은 생성 후 7일이 지나 만료됐습니다.' }, 410) };
  return { room };
}

async function requester(db: D1Database, roomId: string, request: Request) {
  const token = request.headers.get('X-Moyeo-Member-Token');
  if (!token) return null;
  const tokenHash = await hashToken(token);
  return db.prepare('SELECT * FROM members WHERE room_id = ?1 AND token_hash = ?2').bind(roomId, tokenHash).first<MemberRow>();
}

function publicMember(member: MemberRow, includePreference: boolean) {
  return {
    id: member.id, name: member.name, color: member.color, host: Boolean(member.is_host),
    preference: includePreference && member.preference_json ? JSON.parse(member.preference_json) : undefined,
    preferenceComplete: Boolean(member.preference_json),
  };
}

async function roomSnapshot(db: D1Database, room: RoomRow, request: Request) {
  const member = await requester(db, room.id, request);
  const membersResult = await db.prepare('SELECT * FROM members WHERE room_id = ?1 ORDER BY created_at').bind(room.id).all<MemberRow>();
  const members = membersResult.results;
  const votesResult = await db.prepare('SELECT member_id, course_id, round FROM votes WHERE room_id = ?1 AND round = ?2').bind(room.id, room.vote_round).all<VoteRow>();
  const allVoted = members.length === room.expected_members && votesResult.results.length === members.length;
  const votes = allVoted ? Object.fromEntries(votesResult.results.map((vote) => [vote.member_id, vote.course_id])) : {};
  return {
    room: {
      id: room.id, name: room.name, origin: room.origin, destination: room.destination,
      startDate: room.start_date, endDate: room.end_date, transport: room.transport, stay: room.stay,
      expectedMembers: room.expected_members, voteRound: room.vote_round,
      runoffCourseIds: JSON.parse(room.runoff_course_ids), finalCourseId: room.final_course_id,
      createdAt: room.created_at, expiresAt: room.expires_at,
    },
    members: members.map((item) => publicMember(item, Boolean(member))),
    requesterMemberId: member?.id ?? null,
    hasVoted: Boolean(member && votesResult.results.some((vote) => vote.member_id === member.id)),
    allVoted,
    votes,
  };
}

export async function handleRoomApi(request: Request, db: D1Database, url: URL, searchCredentials: SearchCredentials): Promise<Response | null> {
  if (url.pathname === '/api/rooms' && request.method === 'POST') {
    const body = await readBody(request);
    if (!body) return json({ error: '요청 형식을 확인해 주세요.' }, 400);
    const name = text(body.name, 50), origin = text(body.origin, 40), destination = text(body.destination, 40);
    const hostName = text(body.hostName, 20), startDate = text(body.startDate, 10), endDate = text(body.endDate, 10);
    const transport = text(body.transport, 20), stay = text(body.stay, 30);
    const expectedMembers = Number(body.expectedMembers ?? 4);
    if (!name || !origin || !destination || !hostName || !startDate || !endDate || !Number.isInteger(expectedMembers) || expectedMembers < 2 || expectedMembers > 6) {
      return json({ error: '여행방 필수 정보를 확인해 주세요.' }, 400);
    }
    const roomId = randomRoomId(), memberId = crypto.randomUUID(), token = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000), expiresAt = roomExpiresAt(now), tokenHash = await hashToken(token);
    await db.batch([
      db.prepare('INSERT INTO rooms (id,name,origin,destination,start_date,end_date,transport,stay,expected_members,created_at,expires_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)').bind(roomId, name, origin, destination, startDate, endDate, transport, stay, expectedMembers, now, expiresAt),
      db.prepare('INSERT INTO members (id,room_id,name,color,is_host,token_hash,created_at) VALUES (?1,?2,?3,?4,1,?5,?6)').bind(memberId, roomId, hostName, COLORS[0], tokenHash, now),
    ]);
    return json({ roomId, memberId, token, expiresAt }, 201);
  }

  const match = url.pathname.match(/^\/api\/rooms\/([a-z0-9]+)(?:\/(members|preferences|recommendations|itinerary|votes|resolve))?$/);
  if (!match) return null;
  const [, roomId, action] = match;
  const found = await activeRoom(db, roomId);
  if (found.error) return found.error;
  const room = found.room!;

  if (!action && request.method === 'GET') return json(await roomSnapshot(db, room, request));

  if (action === 'members' && request.method === 'POST') {
    const body = await readBody(request), name = text(body?.name, 20);
    if (!name) return json({ error: '별명을 입력해 주세요.' }, 400);
    const count = await db.prepare('SELECT COUNT(*) AS count FROM members WHERE room_id = ?1').bind(roomId).first<{ count: number }>();
    if ((count?.count ?? 0) >= room.expected_members) return json({ error: '여행방 참여 인원이 모두 찼습니다.' }, 409);
    const memberId = crypto.randomUUID(), token = crypto.randomUUID(), tokenHash = await hashToken(token), now = Math.floor(Date.now() / 1000);
    try {
      await db.prepare('INSERT INTO members (id,room_id,name,color,is_host,token_hash,created_at) VALUES (?1,?2,?3,?4,0,?5,?6)').bind(memberId, roomId, name, COLORS[count?.count ?? 0], tokenHash, now).run();
    } catch (reason) {
      console.error('room-member-insert-failed', reason);
      return json({ error: '이미 사용 중인 별명이거나 참여 정보를 저장할 수 없습니다.' }, 409);
    }
    return json({ memberId, token }, 201);
  }

  const member = await requester(db, roomId, request);
  if (!member) return json({ error: '이 여행방의 참여자 인증이 필요합니다.' }, 401);

  if (!action && request.method === 'DELETE') {
    if (!member.is_host) return json({ error: '여행방은 방장만 삭제할 수 있습니다.' }, 403);
    await db.prepare('DELETE FROM rooms WHERE id = ?1').bind(roomId).run();
    return json({ ok: true });
  }

  if (action === 'recommendations' && request.method === 'GET') {
    if (room.recommendation_json) return json({ courses: JSON.parse(room.recommendation_json) });
    const members = await db.prepare('SELECT preference_json FROM members WHERE room_id = ?1').bind(roomId).all<{ preference_json: string | null }>();
    if (members.results.length !== room.expected_members || members.results.some((item) => !item.preference_json)) {
      return json({ error: '모든 참여자가 취향을 입력한 뒤 추천을 만들 수 있습니다.' }, 409);
    }
    try {
      const preferences = members.results.flatMap((item) => item.preference_json ? [JSON.parse(item.preference_json)] : []);
      const courses = await generateRouteCourses(room.origin, room.destination, searchCredentials, preferences);
      const encoded = JSON.stringify(courses);
      await db.prepare('UPDATE rooms SET recommendation_json = ?1 WHERE id = ?2 AND recommendation_json IS NULL').bind(encoded, roomId).run();
      const saved = await db.prepare('SELECT recommendation_json FROM rooms WHERE id = ?1').bind(roomId).first<{ recommendation_json: string }>();
      return json({ courses: JSON.parse(saved?.recommendation_json ?? encoded) });
    } catch (reason) {
      console.error('route-recommendation-failed', reason);
      return json({ error: reason instanceof Error ? reason.message : '경로 주변 추천을 만들지 못했습니다.' }, 502);
    }
  }

  if (action === 'itinerary' && request.method === 'GET') {
    if (!room.final_course_id || !room.recommendation_json) return json({ error: '최종 코스를 먼저 확정해 주세요.' }, 409);
    if (room.itinerary_json) return json({ days: JSON.parse(room.itinerary_json) });
    const courses = JSON.parse(room.recommendation_json) as Array<{ id: string; days: unknown[][] }>;
    const course = courses.find((item) => item.id === room.final_course_id);
    if (!course) return json({ error: '확정된 코스 일정을 찾지 못했습니다.' }, 404);
    return json({ days: course.days });
  }

  if (action === 'itinerary' && request.method === 'PUT') {
    if (!member.is_host) return json({ error: '최종 경로는 방장만 수정할 수 있습니다.' }, 403);
    if (!room.final_course_id) return json({ error: '최종 코스를 먼저 확정해 주세요.' }, 409);
    const body = await readBody(request), days = body?.days;
    if (!Array.isArray(days) || days.length < 1 || days.length > 7 || days.some((day) => !Array.isArray(day) || day.length < 1 || day.length > 20)) {
      return json({ error: '일정 형식을 확인해 주세요.' }, 400);
    }
    const encoded = JSON.stringify(days);
    if (encoded.length > 100_000) return json({ error: '일정 정보가 너무 깁니다.' }, 400);
    await db.prepare('UPDATE rooms SET itinerary_json = ?1 WHERE id = ?2').bind(encoded, roomId).run();
    return json({ ok: true });
  }

  if (action === 'preferences' && request.method === 'PUT') {
    const body = await readBody(request), preference = body?.preference;
    if (!preference || typeof preference !== 'object') return json({ error: '취향 정보를 확인해 주세요.' }, 400);
    const encoded = JSON.stringify(preference);
    if (encoded.length > 2000) return json({ error: '취향 정보가 너무 깁니다.' }, 400);
    await db.prepare('UPDATE members SET preference_json = ?1 WHERE id = ?2').bind(encoded, member.id).run();
    return json({ ok: true });
  }

  if (action === 'votes' && request.method === 'POST') {
    const body = await readBody(request), courseId = text(body?.courseId, 20);
    const allowed = room.vote_round === 2 ? JSON.parse(room.runoff_course_ids) as string[] : ['balance', 'slow', 'active'];
    if (!allowed.includes(courseId)) return json({ error: '투표할 수 없는 코스입니다.' }, 400);
    await db.prepare('INSERT INTO votes (room_id,member_id,round,course_id,created_at) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(room_id,member_id,round) DO UPDATE SET course_id=excluded.course_id, created_at=excluded.created_at').bind(roomId, member.id, room.vote_round, courseId, Math.floor(Date.now() / 1000)).run();
    return json({ ok: true });
  }

  if (action === 'resolve' && request.method === 'POST') {
    const members = await db.prepare('SELECT id FROM members WHERE room_id = ?1').bind(roomId).all<{ id: string }>();
    const votes = await db.prepare('SELECT course_id FROM votes WHERE room_id = ?1 AND round = ?2').bind(roomId, room.vote_round).all<{ course_id: string }>();
    if (members.results.length !== room.expected_members || votes.results.length !== members.results.length) return json({ error: '모든 참여자의 투표가 필요합니다.' }, 409);
    const counts: Record<string, number> = {};
    votes.results.forEach((vote) => { counts[vote.course_id] = (counts[vote.course_id] ?? 0) + 1; });
    const max = Math.max(...Object.values(counts)), winners = Object.keys(counts).filter((id) => counts[id] === max);
    if (winners.length > 1 && room.vote_round === 1) {
      await db.prepare("UPDATE rooms SET vote_round=2, runoff_course_ids=?1 WHERE id=?2").bind(JSON.stringify(winners), roomId).run();
      return json({ status: 'runoff', courseIds: winners });
    }
    const winner = winners[0] ?? 'balance';
    await db.prepare('UPDATE rooms SET final_course_id=?1 WHERE id=?2').bind(winner, roomId).run();
    return json({ status: 'final', courseId: winner });
  }

  return new Response('Method Not Allowed', { status: 405 });
}

export async function deleteExpiredRooms(db: D1Database) {
  await db.prepare('DELETE FROM rooms WHERE expires_at <= ?1').bind(Math.floor(Date.now() / 1000)).run();
}
