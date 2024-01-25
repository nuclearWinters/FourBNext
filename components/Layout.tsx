import { FC, ReactNode, useState } from "react"
import { trpc } from "../utils/config"
import { Modal } from "./Modal"
import css from './Layout.module.css'
import Link from "next/link"
import Image from 'next/image'
import { ModalClose } from "./ModalClose"
import { ModalField } from "./ModalField"
import menu from '../public/menu.svg'
import cart from '../public/cart.svg'
import search from '../public/search.svg'
import userSVG from '../public/user.svg'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SearchModal } from "./SearchModal"

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
    const user = trpc.getUser.useQuery();
    const isAdmin = user.data?.is_admin
    const logged = user.data?._id
    const [showRegister, setShowRegister] = useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [showSearchModal, setShowSearchModal] = useState(false)
    const [showLogin, setShowLogin] = useState(false);
    const [registerForm, setRegisterForm] = useState<{
        name: string;
        apellidos: string,
        email: string;
        password: string;
        confirmPassword: string
        phonePrefix: '+52'
        phone: string
    }>({
        name: '',
        apellidos: '',
        password: '',
        email: '',
        confirmPassword: '',
        phonePrefix: '+52',
        phone: '',
    })
    const [loginForm, setLoginForm] = useState<{ email: string; password: string; }>({ email: '', password: '' })
    const logIn = trpc.logIn.useMutation({
        onSuccess: () => {
            setShowLogin(false)
            window.location.reload()
        },
        onError: (e) => {
            toast.error(e.message)
        }
    });
    const logOut = trpc.logOut.useMutation({
        onSuccess: () => {
            localStorage.removeItem('Access-Token')
            window.location.href = "/"
        },
        onError: (e) => {
            toast.error(e.message)
        }
    });
    const register = trpc.register.useMutation({
        onSuccess: () => {
            setShowLogin(false)
            window.location.reload()
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    return <>
        <div
            className={css.fourbHeaderContainer}
            style={{
                position: 'relative',
            }}
        >
            <ToastContainer />
            {showRegister ? <Modal onClose={() => {
                setShowRegister(false)
            }}>
                <ModalClose onClose={() => {
                    setShowRegister(false)
                }} title={"Registrarse"}>
                    <form className={css["auth-form"]}>
                        <div className={css["input-container-modal"]}>
                            <ModalField
                                id="name"
                                label={"Nombre"}
                                required
                                name="name"
                                type="text"
                                value={registerForm.name}
                                onChange={(e) => {
                                    setRegisterForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                }}
                            />
                        </div>
                        <div className={css["input-container-modal"]}>
                            <ModalField
                                id="apellidos"
                                label={"Apellidos"}
                                required
                                name="apellidos"
                                type="text"
                                value={registerForm.apellidos}
                                onChange={(e) => {
                                    setRegisterForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                }}
                            />
                        </div>
                        <div className={css["input-container-modal"]}>
                            <ModalField
                                id="email"
                                label={"Email"}
                                required
                                name="email"
                                type="text"
                                value={registerForm.email}
                                onChange={(e) => {
                                    setRegisterForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                }}
                            />
                        </div>
                        <div className={css["input-container-modal"]}>
                            <label htmlFor="phone">Teléfono</label>
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                <select name="phonePrefix" required onChange={(e) => {
                                    setRegisterForm(({ phonePrefix, ...rest }) => ({ ...rest, phonePrefix: e.target.value as '+52' }))
                                }}>
                                    <option value="+52">🇲🇽 Mexico (+52)</option>
                                </select>
                                <input style={{ flex: 1, width: 10 }} type="text" id="phone" name="phone" required onChange={(e) => {
                                    setRegisterForm(({ phone, ...rest }) => ({ ...rest, phone: e.target.value }))
                                }} />
                            </div>
                        </div>
                        <div className={css["input-container-modal"]}>
                            <ModalField
                                id="password"
                                label={"Contraseña"}
                                required
                                name="password"
                                type="password"
                                value={registerForm.password}
                                onChange={(e) => {
                                    setRegisterForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                }}
                            />
                        </div>
                        <div className={css["input-container-modal"]}>
                            <ModalField
                                id="confirmPassword"
                                label={"Confirmar Contraseña"}
                                required
                                name="confirmPassword"
                                type="password"
                                value={registerForm.confirmPassword}
                                onChange={(e) => {
                                    setRegisterForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                }}
                            />
                        </div>
                        <button
                            className={css["fourb-button"]}
                            onClick={(e) => {
                                e.preventDefault()
                                register.mutate(registerForm)
                            }}
                            type="submit"
                        >
                            Registrarse
                        </button>
                        <button
                            className={css["fourb-button"]}
                            type="button"
                            onClick={() => {
                                setShowRegister(false)
                                setShowLogin(true)
                            }}
                        >
                            Iniciar Sesión
                        </button>
                    </form>
                </ModalClose>
            </Modal> : null}
            {showSearchModal ? (
                <SearchModal setShowSearchModal={setShowSearchModal} />
            ) : null}
            {showLogin ? <Modal onClose={() => {
                setShowLogin(false)
            }}>
                <ModalClose onClose={() => {
                    setShowLogin(false)
                }} title={"Iniciar sesión"}>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault()
                            logIn.mutate({ email: loginForm.email, password: loginForm.password });
                        }}
                        className={css["auth-form"]}
                    >
                        <div className={css["input-container-modal"]}>
                            <label htmlFor="email">Email</label>
                            <input
                                type="text"
                                id="email"
                                name="email"
                                required
                                onChange={(e) => {
                                    setLoginForm(({ password }) => ({ password, email: e.target.value }))
                                }}
                            />
                        </div>
                        <div className={css["input-container-modal"]}>
                            <label htmlFor="password">Contraseña</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                onChange={(e) => {
                                    setLoginForm(({ email }) => ({ email, password: e.target.value }))
                                }}
                            />
                        </div>
                        {logIn.error?.message ? <div>{logIn.error.message}</div> : null}
                        <button className={css["fourb-button"]} type="submit">Iniciar Sesión</button>
                        <button
                            className={css["fourb-button"]}
                            type="button"
                            onClick={() => {
                                setShowLogin(false)
                                setShowRegister(true)
                            }}
                        >
                            Registrarse
                        </button>
                    </form>
                </ModalClose>
            </Modal> : null}
            <div
                className={css["fourb-header"]}
                style={{
                    paddingBottom: 0,
                }}
            >
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                    onClick={() => {
                        setShowSearchModal(true)
                    }}
                >
                    <Image className={css.searchIcon} src={search} alt="" />
                </button>
                <Link
                    href={`/`}
                    style={{
                        color: 'black',
                        fontSize: 30,
                        fontWeight: 600,
                        margin: 'auto',
                    }}
                >
                    FOURB
                </Link>
                {isAdmin ? <Link href={'/inventory-admin'} className={css["header-button-top"]}>Inventario</Link> : null}
                {isAdmin ? <Link href={'/carts'} className={css["header-button-top"]}>Pagos en efectivo</Link> : null}
                {isAdmin ? <Link href={'/shippings'} className={css["header-button-top"]}>Envios</Link> : null}
                {isAdmin ? <Link href={'/deliveries'} className={css["header-button-top"]}>Entregas en mano</Link> : null}
                {logged && !isAdmin ? <Link href={'/account'} className={css["header-button-top"]}>Cuenta</Link> : null}
                {logged && !isAdmin ? <Link href={'/history'} className={css["header-button-top"]}>Historial</Link> : null}
                {logged ? <button className={css["header-button-top"]} onClick={() => {
                    logOut.mutate()
                }}>Cerrar Sesión</button> : null}
                {logged ? null : <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                    onClick={() => {
                        setShowLogin(true)
                        setShowMobileMenu(false)
                    }}
                >
                    <Image className={css.searchIcon} src={userSVG} alt="" />
                </button>}
                <Link
                    href="/cart"
                    style={{
                        marginRight: 30,
                    }}
                >
                    <Image className={css.searchIcon} src={cart} alt="" />
                </Link>
            </div>
            <div className={css["fourb-header-mobile"]} style={{ width: '100%' }}>
                {showMobileMenu ? <Modal onClose={() => {
                    setShowMobileMenu(false)
                }}>
                    <ModalClose onClose={() => {
                        setShowMobileMenu(false)
                    }} title={"Menu"}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <Link href="/cart" className={css["header-button-top"]} onClick={() => {
                                setShowMobileMenu(false)
                            }}>Carro de compras</Link>
                            {isAdmin ? <Link href={'/inventory-admin'} className={css["header-button-top"]} onClick={() => {
                                setShowMobileMenu(false)
                            }}>Inventario</Link> : null}
                            {isAdmin ? <Link href={'/carts'} className={css["header-button-top"]} onClick={() => {
                                setShowMobileMenu(false)
                            }}>Pagos en efectivo</Link> : null}
                            {isAdmin ? <Link href={'/shippings'} className={css["header-button-top"]} onClick={() => {
                                setShowMobileMenu(false)
                            }}>Envios</Link> : null}
                            {isAdmin ? <Link href={'/deliveries'} className={css["header-button-top"]} onClick={() => {
                                setShowMobileMenu(false)
                            }}>Entregas en mano</Link> : null}
                            {logged ? null : <button className={css["header-button-top"]} onClick={() => {
                                setShowLogin(true)
                                setShowMobileMenu(false)
                            }}>Iniciar Sesión</button>}
                            {logged ? null : <button className={css["header-button-top"]} onClick={() => {
                                setShowRegister(true)
                                setShowMobileMenu(false)
                            }}>Registrarse</button>}
                            {logged && !isAdmin ? <Link href={'/account'} className={css["header-button-top"]} onClick={() => {
                                setShowMobileMenu(false)
                            }}>Cuenta</Link> : null}
                            {logged && !isAdmin ? <Link href={'/history'} className={css["header-button-top"]} onClick={() => {
                                setShowMobileMenu(false)
                            }}>Historial</Link> : null}
                            {logged ? <button className={css["header-button-top"]} onClick={() => {
                                logOut.mutate()
                                setShowMobileMenu(false)
                            }}>Cerrar Sesión</button> : null}
                        </div>
                    </ModalClose>
                </Modal> : null}
                <button
                    onClick={() => {
                        setShowMobileMenu(true)
                    }}
                    className={css.menu}
                >
                    <Image src={menu} alt="" width={20} />
                </button>
                <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                    onClick={() => {
                        setShowSearchModal(true)
                    }}
                >
                    <Image className={css.searchIcon} src={search} alt="" />
                </button>
                <Link
                    className={css.linkMobile}
                    href={`/`}
                    style={{
                        color: 'black',
                        fontSize: 30,
                        fontWeight: 600,
                        margin: 'auto',
                    }}
                >
                    FOURB
                </Link>
                {logged ? null : <button
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                    onClick={() => {
                        setShowLogin(true)
                        setShowMobileMenu(false)
                    }}
                >
                    <Image className={css.searchIcon} src={userSVG} alt="" />
                </button>}
                <Link className={css.cartMobile} href={"/cart"}><Image src={cart} alt="" width={30} /></Link>
            </div>
            <div className={css["fourb-header"]} style={{ width: '100%', paddingBottom: '24px' }}>
                <Link className={css.cart} href={"/cart"}><Image src={cart} alt="" width={30} /></Link>
                {[
                    {
                        tag: '',
                        text: 'NUEVA COLECCIÓN',
                    },
                    {
                        tag: 'collar',
                        text: 'COLLARES',
                    },
                    {
                        tag: 'anillo',
                        text: 'ANILLOS',
                    },
                    {
                        tag: 'pulsera',
                        text: 'PULSERAS',
                    },
                    {
                        tag: 'piercing',
                        text: 'PIERCING',
                    },
                    {
                        tag: 'arete',
                        text: 'ARETES',
                    },
                    {
                        tag: 'waterproof',
                        text: 'WATERPROOF',
                    },
                    {
                        tag: 'discounts',
                        text: 'DESCUENTOS',
                    },
                ].map(link =>
                    <Link
                        key={link.tag}
                        href={`/search${link.tag ? link.tag === "discounts" ? `?discounts=true` : `?tag=${link.tag}` : ''}`}
                        className={css["header-button"]}
                    >
                        {link.text}
                    </Link>
                )}
            </div>
        </div>
        {children}
    </>
}