import { trpc } from '../utils/config';
import Head from 'next/head';
import { FC, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import portada from '../public/portada.jpeg'
import homePic from '../public/homePic.jpeg'
import homeHuggie from '../public/homeHuggie.jpeg'
import homeEnvio from '../public/homeEnvio.jpeg'
import homeProduct from '../public/homeProduct.png'
import homeWaterproof from '../public/homeWaterproof.png'
import { HomeTitle } from '../components/HomeTitle';
import { HomeSubtitle } from '../components/HomeSubtitle';
import Carousel from '../components/Carousel';
import { CarouselItem } from '../components/CarouselItem';
import { HomeHalf } from '../components/HomeHalf';
import { HomeTitleHalf } from '../components/HomeTitleHalf';
import { HomeFull } from '../components/HomeFull';
import { HomeFullBig } from '../components/HomeFullBig';
import aretes from '../public/aretes.png'
import collares from '../public/collares.png'
import favoritos from '../public/favoritos.jpeg'
import anillos from '../public/anillos.jpeg'
import nuevaColeccion from '../public/nuevaColeccion.jpeg'
import piercing from '../public/piercing.png'
import pulseras from '../public/pulseras.jpeg'
import descuentos from '../public/descuentos.png'
import Image from 'next/image';
import { TitleLinks } from '../components/TitleLinks';
import { DescriptionMaterial } from '../components/DescriptionMaterial';
import { useMediaQuery } from '../hooks/mediaQuery';
import { descriptions, imagesHome } from './api/trpc/[trpc]';
import { ImagesDBMongo } from '../server/types';
import { Modify } from './product/[id]';
import { HomeMore } from '../components/HomeMore';
import { InstagramModalEdit } from '../components/InstagramModalEdit';
import { DescriptionsDBTRPC } from './refunds';
import { Modal } from '../components/Modal';
import { ModalClose } from '../components/ModalClose';
import css from '../components/Layout.module.css'
import { ModalTextArea } from '../components/ModalTextArea';

export type ImagesDBTRPC = Modify<ImagesDBMongo, {
  _id: string
}>

export const Home: FC<{
  images: ImagesDBTRPC[]
  answers: DescriptionsDBTRPC[]
}> = ({ images, answers }) => {
  const user = trpc.getUser.useQuery();
  const isAdmin = user.data?.is_admin
  const lastProducts = trpc.inventory.useQuery({ limit: 8 });
  const piercingProducts = trpc.inventory.useQuery({ limit: 8, tag: 'piercing' });
  const waterproofProducts = trpc.inventory.useQuery({ limit: 8, tag: 'waterproof' });
  const [form, setForm] = useState({ name: '', description: '' })
  const answer1 = answers.find(answer => answer.name === 'descripcion1')
  const answer2 = answers.find(answer => answer.name === 'descripcion2')
  const answer3 = answers.find(answer => answer.name === 'descripcion3')
  const answer4 = answers.find(answer => answer.name === 'descripcion4')
  const link1 = answers.find(answer => answer.name === 'link1')
  const link2 = answers.find(answer => answer.name === 'link2')
  const link3 = answers.find(answer => answer.name === 'link3')
  const link4 = answers.find(answer => answer.name === 'link4')
  const link5 = answers.find(answer => answer.name === 'link5')
  const addOrEditDescription = trpc.addOrEditDescription.useMutation({
    onSuccess: () => {
      window.location.reload()
    },
    onError: (e) => {
      toast.error(e.message)
    }
  })
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
  const isMobile = useMediaQuery('(max-width: 800px)')
  const portadaHome = images.find(image => image.name === 'home')
  const portadaNuevo1 = images.find(image => image.name === 'nuevo1')
  const portadaNuevo2 = images.find(image => image.name === 'nuevo2')
  const portadaPiercing1 = images.find(image => image.name === 'piercing1')
  const portadaPiercing2 = images.find(image => image.name === 'piercing2')
  const portadaWaterproof = images.find(image => image.name === 'waterproof')
  const portadaCollares = images.find(image => image.name === 'collares')
  const portadaAnillos = images.find(image => image.name === 'anillos')
  const portadaPulseras = images.find(image => image.name === 'pulseras')
  const portadaAretes = images.find(image => image.name === 'aretes')
  const portadaPiercings = images.find(image => image.name === 'piercings')
  const portadaNuevo3 = images.find(image => image.name === 'nuevo3')
  const portadaDescuentos = images.find(image => image.name === 'descuentos')
  const portadaInsta1 = images.find(image => image.name === 'insta1')
  const portadaInsta2 = images.find(image => image.name === 'insta2')
  const portadaFavoritos = images.find(image => image.name === 'favoritos')
  return (
    <div>
      {form.name ? <Modal onClose={() => {
        setForm({ name: '', description: '' })
      }}>
        <ModalClose
          onClose={() => {
            setForm({ name: '', description: '' })
          }}
          title={"Cambiar Descripción"}
        >
          <form className={css["auth-form"]}>
            <div style={{ marginLeft: 20 }}>
              <ModalTextArea
                id="description"
                label="Descripción"
                required
                name="description"
                value={form.description}
                onChange={(e) => {
                  setForm(state => ({ ...state, [e.target.name]: e.target.value }))
                }}
              />
            </div>
            <button
              className={css["fourb-button"]}
              onClick={(e) => {
                e.preventDefault()
                addOrEditDescription.mutate(form)
              }}
              type="submit"
            >
              Actualizar
            </button>
          </form>
        </ModalClose>
      </Modal> : null}
      <Head>
        <title>Inicio - FOURB</title>
      </Head>
      <HomeFull
        name="home"
        isAdmin={isAdmin}
        src={portadaHome?.url || portada.src}
        moreButtonLink={link1?.description}
        nameLink='link1'
      />
      <div
        style={{
          background: '#fffbf9',
          paddingBottom: 80,
        }}
      >
        <HomeTitle>
          NUEVA COLECCIÓN
        </HomeTitle>
        {isAdmin ? (
          <button className='fourb-button' onClick={() => setForm({ name: 'descripcion1', description: answer1?.description ?? 'Descripción de materiales (titanio, acero quirurjico)' })}>
            Editar descripción
          </button>
        ) : null}
        <HomeSubtitle>
          {answer1 ? answer1.description : 'Descripción de materiales (titanio, acero quirurjico)'}
        </HomeSubtitle>
        {lastProducts.isLoading ? <div className="loading" /> : lastProducts.data?.items.length ? <Carousel>
          {(lastProducts.data?.items || []).map(product => (
            <CarouselItem product={product} key={product._id} />
          )) || []}
        </Carousel> : null}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          height: isMobile ? '1316px' : '658px',
        }}
      >
        <HomeHalf
          name='nuevo1'
          isAdmin={isAdmin}
          src={portadaNuevo1?.url || homePic.src}
          moreButtonLink={link2?.description}
          nameLink='link2'
        />
        <HomeHalf
          name='nuevo2'
          isAdmin={isAdmin}
          src={portadaNuevo2?.url || homeProduct.src}
          moreButtonLink={link3?.description}
          title={<HomeTitleHalf>ACERO INOXIDABLE</HomeTitleHalf>}
          nameLink='link3'
        />
      </div>
      <div
        style={{
          backgroundColor: '#fffbf9',
          paddingBottom: 80,
        }}
      >
        <HomeTitle>
          PIERCING
        </HomeTitle>
        {isAdmin ? (
          <button className='fourb-button' onClick={() => setForm({ name: 'descripcion2', description: answer2?.description ?? 'Descripción de materiales (titanio, acero quirurjico)' })}>
            Editar descripción
          </button>
        ) : null}
        <HomeSubtitle>
          {answer2 ? answer2.description : 'Descripción de materiales (titanio, acero quirurjico)'}
        </HomeSubtitle>
        {piercingProducts.data?.items.length ? <Carousel>
          {(piercingProducts.data?.items || []).map(product => (
            <CarouselItem product={product} key={product._id} />
          )) || []}
        </Carousel> : null}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          height: isMobile ? '1316px' : '658px',
        }}
      >
        <HomeHalf
          name='piercing1'
          isAdmin={isAdmin}
          src={portadaPiercing1?.url || homeEnvio.src}
          moreButtonLink={link4?.description}
          title={<HomeTitleHalf>ENVÍO GRATIS</HomeTitleHalf>}
          nameLink='link4'
        />
        <HomeHalf
          name='piercing2'
          isAdmin={isAdmin}
          src={portadaPiercing2?.url || homeHuggie.src}
          moreButtonLink={link5?.description}
          title={<HomeTitleHalf>HUGGIES</HomeTitleHalf>}
          nameLink='link5'
        />
      </div>
      <div
        style={{
          backgroundColor: '#fffbf9',
          paddingBottom: 80,
        }}
      >
        <HomeTitle>
          SUS FAVORITOS
        </HomeTitle>
        {isAdmin ? (
          <button className='fourb-button' onClick={() => setForm({ name: 'descripcion3', description: answer3?.description ?? 'Descripción de materiales (titanio, acero quirurjico)' })}>
            Editar descripción
          </button>
        ) : null}
        <HomeSubtitle>
          {answer3 ? answer3.description : 'Descripción de materiales (titanio, acero quirurjico)'}
        </HomeSubtitle>
        {piercingProducts.isLoading ? <div className="loading" /> : piercingProducts.data?.items.length ? <Carousel>
          {(piercingProducts.data?.items || []).map(product => (
            <CarouselItem product={product} key={product._id} />
          )) || []}
        </Carousel> : null}
      </div>
      <HomeFullBig
        name="waterproof"
        isAdmin={isAdmin}
        src={portadaWaterproof?.url || homeWaterproof.src}
      >
        WATERPROOF
      </HomeFullBig>
      <div
        style={{
          backgroundColor: '#fffbf9',
          paddingBottom: 80,
        }}
      >
        <HomeTitle>
          WATERPROOF
        </HomeTitle>
        {isAdmin ? (
          <button className='fourb-button' onClick={() => setForm({ name: 'descripcion4', description: answer4?.description ?? 'Descripción de materiales (titanio, acero quirurjico)' })}>
            Editar descripción
          </button>
        ) : null}
        <HomeSubtitle>
          {answer4 ? answer4.description : 'Descripción de materiales (titanio, acero quirurjico)'}
        </HomeSubtitle>
        {waterproofProducts.isLoading ? <div className="loading" /> : waterproofProducts.data?.items.length ? <Carousel>
          {(waterproofProducts.data?.items || []).map(product => (
            <CarouselItem product={product} key={product._id} />
          )) || []}
        </Carousel> : null}
      </div>
      <div
        style={{
          padding: isMobile ? '0px 40px' : '0px 100px',
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
              img: <Image src={portadaCollares?.url || collares} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
              name: 'collares' as const
            },
            {
              title: 'ANILLOS',
              href: '/search?tag=anillos',
              img: <Image src={portadaAnillos?.url || anillos} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
              name: 'anillos' as const
            },
            {
              title: 'PULSERAS',
              href: '/search?tag=pulseras',
              img: <Image src={portadaPulseras?.url || pulseras} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
              name: 'pulseras' as const
            },
            {
              title: 'ARETES',
              href: '/search?tag=aretes',
              img: <Image src={portadaAretes?.url || aretes} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
              name: 'aretes' as const
            },
            {
              title: 'PIERCING',
              href: '/search?tag=piercing',
              img: <Image src={portadaPiercings?.url || piercing} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
              }} />,
              name: 'piercing1' as const
            },
            {
              title: 'FAVORITOS',
              href: '/search',
              img: <Image src={portadaFavoritos?.url || favoritos} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
                objectFit: 'cover',
                objectPosition: '50% 55%'
              }} />,
              name: 'favoritos' as const
            },
            {
              title: 'NUEVA COLECCIÓN',
              href: '/search',
              img: <Image src={portadaNuevo3?.url || nuevaColeccion} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
                objectFit: 'cover',
                objectPosition: '50% 55%'
              }} />,
              name: 'nuevo3' as const
            },
            {
              title: 'DESCUENTOS',
              href: '/search?discount=true',
              img: <Image src={portadaDescuentos?.url || descuentos} alt='' height={245} width={245} style={{
                aspectRatio: 'none',
                height: 245,
                width: 245,
                objectFit: 'cover',
                objectPosition: '50% 55%'
              }} />,
              name: 'descuentos' as const
            },
          ].map(collection => {
            return <HomeMore
              {...collection}
              isAdmin={isAdmin}
            />
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
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '30px' : undefined
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '30px' : undefined,
          paddingTop: 10,
          paddingBottom: 20,
        }}
      >
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
          <InstagramModalEdit
            name="insta1"
            isAdmin={isAdmin}
          />
          <div
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{
              __html: portadaInsta1?.url ?? `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/CzcKNryxo1Z/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/p/CzcKNryxo1Z/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">View this post on Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/p/CzcKNryxo1Z/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">A post shared by fourb | joyería (@fourb_mx)</a></p></div></blockquote> <script async src="//www.instagram.com/embed.js"></script>`
            }}
          />
        </div>
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
          <InstagramModalEdit
            name="insta2"
            isAdmin={isAdmin}
          />
          <div
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{
              __html: portadaInsta2?.url ?? `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/Cw5on-mR-ev/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/p/Cw5on-mR-ev/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">View this post on Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/p/Cw5on-mR-ev/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">A post shared by fourb | joyería (@fourb_mx)</a></p></div></blockquote> <script async src="//www.instagram.com/embed.js"></script>`
            }}
          />
        </div>
      </div>
    </div>
  )
}

export const getStaticProps = async () => {
  const images = await imagesHome.find().toArray()
  const answers = await descriptions.find({ name: { $in: ['descripcion1', 'descripcion2', 'descripcion3', 'descripcion4', 'link1', 'link2', 'link3', 'link4', 'link5'] } }).toArray()
  return {
    props: {
      images: images.map(image => ({
        ...image,
        _id: image._id.toHexString()
      })),
      answers: answers.map(answer => ({
        ...answer,
        _id: answer._id.toHexString()
      }))
    }
  }
}

export default Home