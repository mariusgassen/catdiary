import { db } from "@/lib/db";

const TOP_LIMIT = 5;
const RECENT_LIMIT = 8;

/** A cover thumbnail key for an entry, or null when it has no photos. */
type EntryCover = { id: string; name: string | null; breed: string | null; thumbKey: string | null };

export type EntryEngagement = EntryCover & {
  createdAt: Date;
  viewers: number; // people who saw it at all (feed impression or open)
  likes: number;
  comments: number;
};

export type DiaryInsights = {
  totalEntries: number;
  totalViews: number; // detail-page opens (sum of repeats)
  readers: number; // distinct people who opened an entry
  reach: number; // distinct people who saw an entry (feed impression or open)
  totalImpressions: number; // times your cards scrolled into a feed
  avgDwellSeconds: number; // average on-screen time per engaged viewer
  avgReadPct: number; // average furthest read depth on the detail page
  totalLikes: number;
  totalComments: number;
  topEntries: EntryEngagement[];
  recentReaders: {
    user: { id: string; username: string | null; displayName: string | null; avatarKey: string | null };
    entry: { id: string; name: string | null };
    lastSeenAt: Date;
  }[];
};

function coverThumb(photos: { thumbKey: string | null }[]): string | null {
  return photos[0]?.thumbKey ?? null;
}

/**
 * Engagement insights for one user's own diary: how much of their stuff has
 * been seen, read, paw-ed and noted on, which entries land best, and who's been
 * reading lately. Aggregated over entries the user owns. "Readers" counts
 * people who actually opened an entry (`count > 0`); "reach" also counts people
 * who only saw a card scroll past in the feed.
 */
export async function getDiaryInsights(userId: string): Promise<DiaryInsights> {
  const ownedEntries = { catEntry: { is: { ownerId: userId } } };

  const [
    totalEntries,
    viewAgg,
    dwellAgg,
    readAgg,
    readerRows,
    reachRows,
    totalLikes,
    totalComments,
    topRaw,
    recentRaw,
  ] = await Promise.all([
    db.catEntry.count({ where: { ownerId: userId } }),
    db.entryView.aggregate({ where: ownedEntries, _sum: { count: true, feedImpressions: true } }),
    db.entryView.aggregate({ where: { ...ownedEntries, dwellMs: { gt: 0 } }, _avg: { dwellMs: true } }),
    db.entryView.aggregate({ where: { ...ownedEntries, maxReadPct: { gt: 0 } }, _avg: { maxReadPct: true } }),
    db.entryView.findMany({
      where: { ...ownedEntries, count: { gt: 0 } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    db.entryView.findMany({ where: ownedEntries, distinct: ["userId"], select: { userId: true } }),
    db.like.count({ where: ownedEntries }),
    db.comment.count({ where: ownedEntries }),
    db.catEntry.findMany({
      where: { ownerId: userId },
      orderBy: [{ views: { _count: "desc" } }, { createdAt: "desc" }],
      take: TOP_LIMIT,
      select: {
        id: true,
        name: true,
        breed: true,
        createdAt: true,
        photos: { orderBy: { position: "asc" }, take: 1, select: { thumbKey: true } },
        _count: { select: { views: true, likes: true, comments: true } },
      },
    }),
    db.entryView.findMany({
      where: { ...ownedEntries, count: { gt: 0 } },
      orderBy: { lastSeenAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        lastSeenAt: true,
        user: { select: { id: true, username: true, displayName: true, avatarKey: true } },
        catEntry: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    totalEntries,
    totalViews: viewAgg._sum.count ?? 0,
    readers: readerRows.length,
    reach: reachRows.length,
    totalImpressions: viewAgg._sum.feedImpressions ?? 0,
    avgDwellSeconds: Math.round((dwellAgg._avg.dwellMs ?? 0) / 1000),
    avgReadPct: Math.round(readAgg._avg.maxReadPct ?? 0),
    totalLikes,
    totalComments,
    topEntries: topRaw.map((e) => ({
      id: e.id,
      name: e.name,
      breed: e.breed,
      thumbKey: coverThumb(e.photos),
      createdAt: e.createdAt,
      viewers: e._count.views,
      likes: e._count.likes,
      comments: e._count.comments,
    })),
    recentReaders: recentRaw.map((r) => ({
      user: r.user,
      entry: r.catEntry,
      lastSeenAt: r.lastSeenAt,
    })),
  };
}

export type AdminInsights = {
  totals: {
    users: number;
    entries: number;
    views: number; // detail-page opens
    seenPairs: number; // distinct (viewer, entry) rows
    impressions: number; // feed card impressions
    avgDwellSeconds: number;
    avgReadPct: number;
    likes: number;
    comments: number;
    follows: number;
  };
  recent: {
    newUsers7d: number;
    newUsers30d: number;
    newEntries7d: number;
    newEntries30d: number;
  };
  topEntries: (EntryEngagement & {
    owner: { id: string; username: string | null; displayName: string | null };
  })[];
  topDiarists: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarKey: string | null;
    views: number; // total views their entries received
    entries: number;
  }[];
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Platform-wide insights for admins: totals, recent growth, the most-seen
 * entries and the diarists whose work gets read the most.
 */
export async function getAdminInsights(): Promise<AdminInsights> {
  const since7d = daysAgo(7);
  const since30d = daysAgo(30);

  const [
    users,
    entries,
    viewAgg,
    seenPairs,
    dwellAgg,
    readAgg,
    likes,
    comments,
    follows,
    newUsers7d,
    newUsers30d,
    newEntries7d,
    newEntries30d,
    topRaw,
    topDiaristRows,
  ] = await Promise.all([
    db.user.count(),
    db.catEntry.count(),
    db.entryView.aggregate({ _sum: { count: true, feedImpressions: true } }),
    db.entryView.count(),
    db.entryView.aggregate({ where: { dwellMs: { gt: 0 } }, _avg: { dwellMs: true } }),
    db.entryView.aggregate({ where: { maxReadPct: { gt: 0 } }, _avg: { maxReadPct: true } }),
    db.like.count(),
    db.comment.count(),
    db.follow.count({ where: { approved: true } }),
    db.user.count({ where: { createdAt: { gte: since7d } } }),
    db.user.count({ where: { createdAt: { gte: since30d } } }),
    db.catEntry.count({ where: { createdAt: { gte: since7d } } }),
    db.catEntry.count({ where: { createdAt: { gte: since30d } } }),
    db.catEntry.findMany({
      orderBy: [{ views: { _count: "desc" } }, { createdAt: "desc" }],
      take: TOP_LIMIT,
      select: {
        id: true,
        name: true,
        breed: true,
        createdAt: true,
        photos: { orderBy: { position: "asc" }, take: 1, select: { thumbKey: true } },
        owner: { select: { id: true, username: true, displayName: true } },
        _count: { select: { views: true, likes: true, comments: true } },
      },
    }),
    // Total views received per diarist (joins EntryView → CatEntry.ownerId),
    // ranked. Raw SQL because the sum has to cross the entry→owner relation.
    db.$queryRaw<
      { id: string; views: bigint; entries: bigint }[]
    >`
      SELECT e.owner_id AS id,
             COALESCE(SUM(ev.count), 0) AS views,
             COUNT(DISTINCT e.id) AS entries
      FROM cat_entries e
      JOIN entry_views ev ON ev.cat_entry_id = e.id
      GROUP BY e.owner_id
      ORDER BY views DESC
      LIMIT ${TOP_LIMIT}
    `,
  ]);

  const diaristIds = topDiaristRows.map((r) => r.id);
  const diaristUsers = diaristIds.length
    ? await db.user.findMany({
        where: { id: { in: diaristIds } },
        select: { id: true, username: true, displayName: true, avatarKey: true },
      })
    : [];
  const diaristById = new Map(diaristUsers.map((u) => [u.id, u]));

  return {
    totals: {
      users,
      entries,
      views: viewAgg._sum.count ?? 0,
      seenPairs,
      impressions: viewAgg._sum.feedImpressions ?? 0,
      avgDwellSeconds: Math.round((dwellAgg._avg.dwellMs ?? 0) / 1000),
      avgReadPct: Math.round(readAgg._avg.maxReadPct ?? 0),
      likes,
      comments,
      follows,
    },
    recent: { newUsers7d, newUsers30d, newEntries7d, newEntries30d },
    topEntries: topRaw.map((e) => ({
      id: e.id,
      name: e.name,
      breed: e.breed,
      thumbKey: coverThumb(e.photos),
      createdAt: e.createdAt,
      viewers: e._count.views,
      likes: e._count.likes,
      comments: e._count.comments,
      owner: e.owner,
    })),
    topDiarists: topDiaristRows.flatMap((r) => {
      const u = diaristById.get(r.id);
      if (!u) return [];
      return [
        {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarKey: u.avatarKey,
          views: Number(r.views),
          entries: Number(r.entries),
        },
      ];
    }),
  };
}
