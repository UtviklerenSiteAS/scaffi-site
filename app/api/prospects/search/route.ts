import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLACES_BASE = "https://places.googleapis.com/v1/places:searchText";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { error: "Authentication required", code: "UNAUTHORIZED" },
            { status: 401 }
        );
    }

    const { query, pageToken } = await req.json();
    if (!query?.trim()) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 });
    }

    // ── 1. Call Places API (New) Text Search ──────────────────────────────────
    const requestBody: any = {
        textQuery: query,
        pageSize: 20,
        languageCode: "no", // Norwegian results first; change as needed
    };
    if (pageToken) {
        requestBody.pageToken = pageToken;
    }

    const searchRes = await fetch(PLACES_BASE, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": [
                "places.id",
                "places.displayName",
                "places.formattedAddress",
                "places.internationalPhoneNumber",
                "places.websiteUri",
                "places.rating",
                "places.userRatingCount",
                "places.businessStatus",
                "places.types",
                "nextPageToken",
            ].join(","),
        },
        body: JSON.stringify(requestBody),
    });

    if (!searchRes.ok) {
        const errText = await searchRes.text();
        console.error("Places API error:", errText);
        return NextResponse.json(
            { error: "Google Maps request failed", details: errText },
            { status: 502 }
        );
    }

    const searchData = await searchRes.json();
    const rawPlaces: any[] = searchData.places ?? [];
    const nextPageToken = searchData.nextPageToken;

    // Filter to strictly ONLY places that have no website
    const places = rawPlaces.filter(place => !place.websiteUri);

    if (places.length === 0) {
        // We still return nextPageToken so the frontend can keep loading if needed
        return NextResponse.json({ prospects: [], nextPageToken });
    }

    // ── 2. Process results ─────────────────────────────────────
    const prospects = await Promise.all(
        places.map(async (place) => {
            const placeId: string = place.id;
            const name: string = place.displayName?.text ?? "Unknown";
            const phone: string | null = place.internationalPhoneNumber ?? null;
            const website: string | null = place.websiteUri ?? null;
            const address: string | null = place.formattedAddress ?? null;
            const rating: number | null = place.rating ?? null;

            // Return data without saving — user picks which ones to save
            return {
                id: placeId,
                placeId,
                name,
                phone,
                website,
                address,
                rating,
                status: "LEAD" as const,
            };
        })
    );

    return NextResponse.json({ prospects, nextPageToken });
}
