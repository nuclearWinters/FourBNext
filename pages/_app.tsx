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

<script
    dangerouslySetInnerHTML={{
      __html: `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '1404349391306708');
        fbq('track', 'PageView');
      `,
    }}
  />
        
      <script
  dangerouslySetInnerHTML={{
    __html: `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
        ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
        ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
        ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
        ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
        ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
        n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;
        e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
        ttq.load('D3I9VKBC77U89SJ4Q130');
        ttq.page();
      }(window, document, 'ttq');
    `,
  }}
/>

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
