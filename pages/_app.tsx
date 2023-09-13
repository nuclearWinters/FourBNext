import { FC } from "react";
import { Layout } from "../components/Layout";
import { trpc } from "../utils/config";
import '../styles/globals.css'
import Script from "next/script";

const MyApp: FC<{ Component: FC<any>, pageProps: any }> = ({ Component, pageProps }) => {
  return (
    <>
      <Script type="module" crossOrigin="anonymous" src="https://assets.conekta.com/component/2.0.2/assets/component.min.js"></Script>
      <link rel="stylesheet" href="https://assets.conekta.com/component/2.0.2/assets/style.css"></link>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}

export default trpc.withTRPC(MyApp);