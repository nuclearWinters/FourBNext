import { trpc } from '../utils/config';
import Head from 'next/head';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import portada from '../public/portada.jpeg'
import homePic from '../public/homePic.jpeg'
import homeHuggie from '../public/homeHuggie.jpeg'
import homeEnvio from '../public/homeEnvio.jpeg'
import homeProduct from '../public/homeProduct.webp'
import homeWaterproof from '../public/homeWaterproof.webp'
import { HomeTitle } from '../components/HomeTitle';
import { HomeSubtitle } from '../components/HomeSubtitle';
import Carousel from '../components/Carousel';
import { CarouselItem } from '../components/CarouselItem';
import { HomeHalf } from '../components/HomeHalf';
import { HomeTitleHalf } from '../components/HomeTitleHalf';
import { HomeFull } from '../components/HomeFull';
import { HomeFullBig } from '../components/HomeFullBig';
import Link from 'next/link';
import aretes from '../public/aretes.png'
import collares from '../public/collares.png'
import favoritos from '../public/favoritos.jpeg'
import anillos from '../public/anillos.jpeg'
import nuevaColeccion from '../public/nuevaColeccion.jpeg'
import piercing from '../public/piercing.png'
import pulseras from '../public/pulseras.jpeg'
import descuentos from '../public/descuentos.jpeg'
import Image from 'next/image';
import { TitleLinks } from '../components/TitleLinks';
import { DescriptionMaterial } from '../components/DescriptionMaterial';

export default function Home() {
  const lastProducts = trpc.inventory.useQuery({ limit: 8 });
  const piercingProducts = trpc.inventory.useQuery({ limit: 8, tag: 'piercing' });
  const waterproofProducts = trpc.inventory.useQuery({ limit: 8, tag: 'waterproof' });
  const confirmEmail = trpc.verifyEmail.useMutation({
    onSuccess: () => {
      toast.success('Email confirmed succesfully!')
      window.history.replaceState(null, '', `?`)
    },
    onError: (e) => {
      toast.error(e.message)
    }
  })
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    if (token) {
      confirmEmail.mutate({
        token
      })
    }
  }, [])
  return (
    <div>
      <Head>
        <title>Inicio - FOURB</title>
      </Head>
      <HomeFull
        src={portada.src}
        moreButtonLink='search/'
      />
      <div
        style={{
          background: '#fffbf9',
        }}
      >
        <HomeTitle>
          NUEVA COLECCIÓN
        </HomeTitle>
        <HomeSubtitle>
          Descripción de materiales (titanio, acero quirurjico)
        </HomeSubtitle>
        {lastProducts.isLoading ? <div className="loading" /> : lastProducts.data?.items.length ? <Carousel>
          {(lastProducts.data?.items || []).map(product => (
            <CarouselItem product={product} />
          )) || []}
        </Carousel> : null}
      </div>
      <div
        style={{
          height: '658px',
          display: 'flex',
        }}
      >
        <HomeHalf
          src={homePic.src}
        />
        <HomeHalf
          src={homeProduct.src}
          moreButtonLink={'/search"'}
          title={<HomeTitleHalf>ACERO INOXIDABLE</HomeTitleHalf>}
        />
      </div>
      <div style={{
        backgroundColor: '#fffbf9',
      }}>
        <HomeTitle>
          PIERCING
        </HomeTitle>
        <HomeSubtitle>
          Descripción de materiales (titanio, acero quirurjico)
        </HomeSubtitle>
        {piercingProducts.data?.items.length ? <Carousel>
          {(piercingProducts.data?.items || []).map(product => (
            <CarouselItem product={product} />
          )) || []}
        </Carousel> : null}
      </div>
      <div
        style={{
          height: '658px',
          display: 'flex',
        }}
      >
        <HomeHalf
          src={homeEnvio.src}
          title={<HomeTitleHalf>ENVÍO GRATIS</HomeTitleHalf>}
        />
        <HomeHalf
          src={homeHuggie.src}
          moreButtonLink={'/search"'}
          title={<HomeTitleHalf>HUGGIES</HomeTitleHalf>}
        />
      </div>
      <div style={{
        backgroundColor: '#fffbf9',
      }}>
        <HomeTitle>
          SUS FAVORITOS
        </HomeTitle>
        <HomeSubtitle>
          Descripción de materiales (titanio, acero quirurjico)
        </HomeSubtitle>
        {piercingProducts.isLoading ? <div className="loading" /> : piercingProducts.data?.items.length ? <Carousel>
          {(piercingProducts.data?.items || []).map(product => (
            <CarouselItem product={product} />
          )) || []}
        </Carousel> : null}
      </div>
      <HomeFullBig src={homeWaterproof.src}>
        WATERPROOF
      </HomeFullBig>
      <div style={{
        backgroundColor: '#fffbf9',
      }}>
        <HomeTitle>
          WATERPROOF
        </HomeTitle>
        <HomeSubtitle>
          Descripción de materiales (titanio, acero quirurjico)
        </HomeSubtitle>
        {waterproofProducts.isLoading ? <div className="loading" /> : waterproofProducts.data?.items.length ? <Carousel>
          {(waterproofProducts.data?.items || []).map(product => (
            <CarouselItem product={product} />
          )) || []}
        </Carousel> : null}
      </div>
      <div
        style={{
          padding: '0px 100px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fffbf9',
        }}
      >
        <TitleLinks>
          MÁS PIEZAS
        </TitleLinks>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '40px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {[
            {
              title: 'COLLARES',
              href: '/search?tag=collares',
              img: <Image src={collares} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
            },
            {
              title: 'ANILLOS',
              href: '/search?tag=anillos',
              img: <Image src={anillos} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
            },
            {
              title: 'PULSERAS',
              href: '/search?tag=pulseras',
              img: <Image src={pulseras} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
            },
            {
              title: 'ARETES',
              href: '/search?tag=aretes',
              img: <Image src={aretes} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
            },
            {
              title: 'PIERCING',
              href: '/search?tag=piercing',
              img: <Image src={piercing} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
            },
            {
              title: 'FAVORITOS',
              href: '/search',
              img: <Image src={favoritos} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
                objectFit: 'cover',
                objectPosition: '50% 55%'
              }} />,
            },
            {
              title: 'NUEVA COLECCIÓN',
              href: '/search',
              img: <Image src={nuevaColeccion} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
                objectFit: 'cover',
                objectPosition: '50% 55%'
              }} />,
            },
            {
              title: 'DESCUENTOS',
              href: '/search?discount=true',
              img: <Image src={descuentos} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
                objectFit: 'cover',
                objectPosition: '50% 55%'
              }} />,
            },
          ].map(colletion => {
            return <Link
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
              href={colletion.href}>
              {colletion.img}
              <div
                style={{
                  fontWeight: '600',
                  color: 'rgb(0, 0, 0)',
                  fontFamily: 'Montserrat',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginTop: '10px',
                  marginBottom: '16px',
                }}
              >
                {colletion.title}
              </div>
            </Link>
          })}
        </div>
      </div>
      <div
        style={{
          backgroundColor: '#fffbf9',
        }}
      >
        <div
          style={{
            fontFamily: 'Kage',
            color: 'black',
            fontSize: '58px',
            textAlign: 'center',
            paddingBottom: '60px',
            paddingTop: '60px',
          }}
        >
          MATERIALES
        </div>
        <div
          style={{
            display: 'flex'
          }}
        >
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: 'Kage',
                color: 'black',
                fontSize: '58px',
                marginBottom: '30px',
                width: '300px',
                textAlign: 'center',
              }}
            >
              ACERO INOXIDABLE
            </div>
            <div
              style={{
                fontFamily: 'Montserrat',
                fontSize: '14.6667px',
                lineHeight: '20px',
                fontWeight: '600',
                width: '250px',
                textAlign: 'center',
              }}
            >
              COLOR NATURAL DEL MATERIAL, POR ESO NUNCA SE OXIDA, SI SE LLEGARA A OPACAR SOLO SE TIENE QUE LIMPIAR CON UN PAÑITO. NO TE VA A MANCHAS EN LA PIEL.
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: 'Kage',
                color: 'black',
                fontSize: '58px',
                marginBottom: '30px',
                width: '300px',
                textAlign: 'center',
              }}
            >
              ORO LAMINADO DE 10K Y 14K
            </div>
            <DescriptionMaterial>
              BASE DE LATÓN O COBRE CUBIERTA POR UNA CAPA GRUESA DE ORO DE 10K (COLOR DORADO) O 14K (COLOR ORO ROSA).
            </DescriptionMaterial>
            <DescriptionMaterial>
              PUEDES DORMIR, BAÑARTE CON TUS PIEZAS Y LLEVARLOS A LA PLAYA, PERO OJO: NO EN EXCESO Y EL TIEMPO DE VIDA DEPENDERÁ DEL ESTILO DE VIDA QUE LLEVES, SIN EMBARGO,
            </DescriptionMaterial>
            <DescriptionMaterial>
              ESTÁ ALTAMENTE RECOMENDADO.
            </DescriptionMaterial>
          </div>
        </div>
      </div>
    </div>
  )
}
