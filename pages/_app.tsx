import { FC } from "react";
import { Layout } from "../components/Layout";
import { trpc } from "../utils/config";
import '../styles/globals.css'

const MyApp: FC<{ Component: FC<any>, pageProps: any} > = ({ Component, pageProps }) => {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}

export default trpc.withTRPC(MyApp);