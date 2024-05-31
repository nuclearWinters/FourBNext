import { FC, useRef } from "react";
import { Layout } from "../components/Layout";
import { VIRTUAL_HOST, trpc } from "../utils/config";
import '../styles/globals.css'
import Script from "next/script";
import Head from "next/head";
import fourblogo from '../public/fourblogo.jpg'

const MyApp: FC<{ Component: FC<any>, pageProps: any }> = ({ Component, pageProps }) => {
  const footerRef = useRef<HTMLDivElement | null>(null)
  return (
    <>
      <Head>
        <meta property="description" content="Boutique de joyería fina en oro laminado y acero inoxidable" />
        <meta property="og:description" content="Boutique de joyería fina en oro laminado y acero inoxidable" />
        <meta property="og:title" content="FOURB" />
        <meta property="og:image" content={`https://${VIRTUAL_HOST}${fourblogo.src}`} />
        <meta property="og:image:type" content="image/jpg" />
        <meta property="og:image:width" content="300" />
        <meta property="og:image:height" content="300" />
        <meta property="og:url" content={`https://${VIRTUAL_HOST}`} />
        <meta property="og:type" content="website" />
      </Head>
      <Script type="module" crossOrigin="anonymous" src="https://assets.conekta.com/component/2.0.2/assets/component.min.js"></Script>
      <link rel="stylesheet" href="https://assets.conekta.com/component/2.0.2/assets/style.css"></link>
      <Layout footerRef={footerRef}>
        <Component {...pageProps} footerRef={footerRef} />
      </Layout>
    </>
  )
}

export default trpc.withTRPC(MyApp);