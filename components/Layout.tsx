import { FC, ReactNode, useState } from "react"
import { trpc } from "../utils/config"
import { Modal } from "./Modal"
import css from './Layout.module.css'
import Link from "next/link"
import fourb from '../public/fourb.png'
import Image from 'next/image'
import { useRouter } from "next/router"
import { ModalClose } from "./ModalClose"
import { ModalField } from "./ModalField"
import ellipsis from '../public/ellipsis-vertical.svg'
import cart from '../public/cart.svg'

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
    const router = useRouter()
    const [input, setInput] = useState('')
    const user = trpc.getUser.useQuery();
    const isAdmin = user.data?.is_admin
    const logged = user.data?._id
    const [showRegister, setShowRegister] = useState(false)
    const [showLogin, setShowLogin] = useState(false);
    const [registerForm, setRegisterForm] = useState<{
        name: string;
        apellidos: string,
        email: string;
        password: string;
        confirmPassword: string
        phonePrefix: string
        phone: string
    }>({
        name: '',
        apellidos: '',
        password: '',
        email: '',
        confirmPassword: '',
        phonePrefix: '',
        phone: '',
    })
    const [loginForm, setLoginForm] = useState<{ email: string; password: string; }>({ email: '', password: '' })
    const logIn = trpc.logIn.useMutation({
        onSuccess: () => {
            setShowLogin(false)
            window.location.reload()
        }
    });
    const logOut = trpc.logOut.useMutation({
        onSuccess: () => {
            localStorage.clear()
            window.location.reload()
        }
    });
    const register = trpc.register.useMutation({
        onSuccess: () => {
            setShowLogin(false)
            window.location.reload()
        }
    })
    return <>
        <div className={css.fourbHeaderContainer}>
            <div className={css["fourb-header"]}>
                <button className={css.menu}><Image src={ellipsis} alt="" width={20} /></button>
                <Link href={`/`}>
                    <Image height={46} width={80} className={css["fourb-logo"]} src={fourb} alt="" />
                </Link>
                <Link href="/cart" className={css["header-button"]}>Carro de compras</Link>
                {isAdmin ? <Link href={'/inventory-admin'} className={css["header-button"]}>Inventario</Link> : null}
                {logged ? null : <button className={css["header-button"]} onClick={() => {
                    setShowLogin(true)
                }}>Iniciar Sesión</button>}
                {logged ? null : <button className={css["header-button"]} onClick={() => {
                    setShowRegister(true)
                }}>Registrarse</button>}
                {logged ? <Link href={'/account'} className={css["header-button"]}>Cuenta</Link> : null}
                {logged ? <Link href={'/history'} className={css["header-button"]}>Historial</Link> : null}
                {logged ? <button className={css["header-button"]} onClick={() => {
                    logOut.mutate()
                }}>Cerrar Sesión</button> : null}
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
                                        setRegisterForm(({ phonePrefix, ...rest }) => ({ ...rest, phonePrefix: e.target.value }))
                                    }}>
                                        <option value="+52">🇲🇽 Mexico (+52)</option>
                                    </select>
                                    <input style={{ flex: 1 }} type="text" id="phone" name="phone" required onChange={(e) => {
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
                        </form>
                    </ModalClose>
                </Modal> : null}
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
                        </form>
                    </ModalClose>
                </Modal> : null}
            </div>
            <div className={css["fourb-header"]} style={{ width: '100%' }}>
                <form
                    className={css.formSearch}
                    onSubmit={(e) => {
                        e.preventDefault()
                        router.push('/search?search=' + input)
                    }}
                >
                    <input className="searchProduct" name="search" placeholder="Busqueda..." value={input} onChange={e => {
                        setInput(e.target.value)
                    }} />
                </form>
                <Link className={css.cart} href={"/cart"}><Image src={cart} alt="" width={30} /></Link>
                {[
                    {
                        tag: 'arete',
                        text: 'Aretes',
                    },
                    {
                        tag: 'anillo',
                        text: 'Anillos',
                    },
                    {
                        tag: 'collar',
                        text: 'Collares',
                    },
                    {
                        tag: 'pulsera',
                        text: 'Pulseras',
                    },
                    {
                        tag: 'piercing',
                        text: 'Piercings',
                    },
                    {
                        tag: 'tobillera',
                        text: 'Tobilleras',
                    },
                    {
                        tag: 'oro10k',
                        text: 'Oro 10k',
                    },
                    {
                        tag: 'ajustable',
                        text: 'Ajustables',
                    },
                    {
                        tag: 'talla5',
                        text: 'Talla 5',
                    },
                    {
                        tag: 'talla6',
                        text: 'Talla 6',
                    },
                    {
                        tag: 'talla7',
                        text: 'Talla 7',
                    },
                    {
                        tag: 'talla8',
                        text: 'Talla 8',
                    },
                    {
                        tag: 'talla9',
                        text: 'Talla 9',
                    },
                    {
                        tag: 'talla10',
                        text: 'Talla 10',
                    },
                ].map(link =>
                    <Link
                        key={link.tag}
                        href={'/search?tag=' + link.tag}
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