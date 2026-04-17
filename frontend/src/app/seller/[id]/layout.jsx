const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

export async function generateMetadata({ params }) {
  if (!apiUrl) {
    return { title: 'Seller | LuxeRent' };
  }

  try {
    const resolvedParams = typeof params.then === 'function' ? await params : params;
    const { id } = resolvedParams;
    const res = await fetch(`${apiUrl}/api/seller/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: 'Seller | LuxeRent' };
    const data = await res.json();
    const seller = data.seller || {};
    const title = `${seller?.name || 'Seller'} | LuxeRent Shop`;
    const description = seller?.bio?.slice(0, 160) || `Rent from ${seller?.name} on LuxeRent. ${seller?.location || ''}`.trim();
    const image = seller?.shopBanner || seller?.avatar;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        ...(image && { images: [{ url: image, width: 1200, height: 630, alt: seller?.name }] }),
        type: 'profile',
      },
    };
  } catch {
    return { title: 'Seller | LuxeRent' };
  }
}

export default function SellerShopLayout({ children }) {
  return children;
}
