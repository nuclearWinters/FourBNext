import Link from 'next/link';
import { trpc } from '../utils/config';
import { ProductList } from '../components/ProductList';
import Head from 'next/head';

export default function Home() {
  const lastProducts = trpc.inventory.useQuery({ limit: 8 });
  const discountProducts = trpc.inventory.useQuery({ limit: 8, discounts: true });
  return (
    <div>
      <Head>
        <title>Inicio - FourB</title>
      </Head>
      <div style={{
        backgroundImage: "url('./banner.webp')",
        height: 184,
        backgroundSize: 'cover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <div style={{
          color: "white",
          fontSize: 30,
          fontWeight: "bold",
          letterSpacing: 4,
          background: "rgba(0,0,0,0.3)",
          padding: 10,
          textAlign: 'center',
        }}
        >
          NUEVAS JOYITAS
        </div>
        <Link
          href={"/search"}
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "none",
            color: "white",
            fontSize: 20,
            padding: 10,
            cursor: "pointer",
            textAlign: 'center',
          }}
        >
          Ver colección
        </Link>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {lastProducts.data?.items.map(product => (
          <ProductList product={product} key={product._id} />
        ))}
      </div>
      {discountProducts.isLoading ? <div className="loading" /> : null}
      <div style={{
        height: 184,
        backgroundColor: 'rgb(230, 222, 202)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <div style={{
          color: 'black',
          fontSize: 30,
          fontWeight: 'bold',
          letterSpacing: 4,
          padding: 10,
        }}>REBAJAS</div>
        <Link href={"/search?discounts=true"} style={{
          border: 'none',
          color: 'black',
          fontSize: 20,
          padding: 10,
          cursor: 'pointer',
          backgroundColor: 'white',
          borderRadius: 4
        }}>Ver colección</Link>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {discountProducts.data?.items.map(product => (
          <ProductList product={product} key={product._id} />
        ))}
      </div>
      {discountProducts.isLoading ? <div className="loading" /> : null}
    </div>
  )
}
