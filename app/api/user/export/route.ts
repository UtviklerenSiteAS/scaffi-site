import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GDPR Art. 20 – Rett til dataportabilitet
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      prospects: true,
      websites: {
        select: {
          id: true,
          name: true,
          businessName: true,
          businessAddress: true,
          businessPhone: true,
          businessCategory: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      domains: true,
    },
  });

  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const exportData = {
    exportert: new Date().toISOString(),
    info: "Dette er alle personopplysninger Scaffi har lagret om deg, i henhold til GDPR artikkel 20.",
    bruker: {
      id: user.id,
      navn: user.name,
      epost: user.email,
      opprettet: user.createdAt,
      abonnement: user.subscriptionTier,
    },
    prospekter: user.prospects.map((p) => ({
      id: p.id,
      navn: p.name,
      adresse: p.address,
      telefon: p.phone,
      vurdering: p.rating,
      status: p.status,
      opprettet: p.createdAt,
    })),
    nettsider: user.websites,
    domener: user.domains,
  };

  const filename = `scaffi-data-${new Date().toISOString().split("T")[0]}.json`;

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
