import { FC } from "react";
import { Layout } from "../components/Layout";
import { VIRTUAL_HOST, trpc } from "../utils/config";
import '../styles/globals.css'
import Script from "next/script";
import Head from "next/head";
import fourblogo from '../public/fourblogo.jpg'

const MyApp: FC<{ Component: FC<any>, pageProps: any }> = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <meta name="description" content="Boutique de joyería fina en oro laminado y acero inoxidable" />
        <meta name="og:description" content="Boutique de joyería fina en oro laminado y acero inoxidable" />
        <meta name="og:title" content="FOURB" />
        <meta name="og:image" content={fourblogo.src} />
        <meta name="og:image:width" content="400" />
        <meta name="og:url" content={`https://${VIRTUAL_HOST}`} />
      </Head>
      <Script type="module" crossOrigin="anonymous" src="https://assets.conekta.com/component/2.0.2/assets/component.min.js"></Script>
      <link rel="stylesheet" href="https://assets.conekta.com/component/2.0.2/assets/style.css"></link>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}

export default trpc.withTRPC(MyApp);