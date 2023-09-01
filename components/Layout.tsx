import { FC, ReactNode, useState } from "react"
import { trpc } from "../utils/config"
import { Modal } from "./Modal"
import css from './layout.module.css'
import Link from "next/link"
import fourb from '../public/fourb.png'
import Image from 'next/image'
import { useRouter } from "next/router"

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
                    <form action="https://{{domain}}/register" onSubmit={(e) => {
                        e.preventDefault()
                        register.mutate(registerForm)
                    }} className={css["auth-form"]} method="POST" id="form-register">
                        <span className={css["close"]}>x</span>
                        <h2 className={css["title"]}>Registrarse</h2>
                        <div className={css["input-container-modal"]}>
                            <label htmlFor="name">Nombre</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                onChange={(e) => {
                                    setRegisterForm(({ name, ...rest }) => ({ ...rest, name: e.target.value }))
                                }}
                            />
                        </div>
                        <div className={css["input-container-modal"]}>
                            <label htmlFor="apellidos">Apellidos</label>
                            <input
                                type="text"
                                id="apellidos"
                                name="apellidos"
                                required
                                onChange={(e) => {
                                    setRegisterForm(({ apellidos, ...rest }) => ({ ...rest, apellidos: e.target.value }))
                                }}
                            />
                        </div>
                        <div className={css["input-container-modal"]}>
                            <label htmlFor="email">Email</label>
                            <input
                                type="text"
                                id="email"
                                name="email"
                                required
                                onChange={(e) => {
                                    setRegisterForm(({ email, ...rest }) => ({ ...rest, email: e.target.value }))
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
                            <label htmlFor="password">Contraseña</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                onChange={(e) => {
                                    setRegisterForm(({ password, ...rest }) => ({ ...rest, password: e.target.value }))
                                }}
                            />
                        </div>
                        <div className={css["input-container-modal"]}>
                            <label htmlFor="password">Confirmar Contraseña</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                required
                                onChange={(e) => {
                                    setRegisterForm(({ confirmPassword, ...rest }) => ({ ...rest, confirmPassword: e.target.value }))
                                }}
                            />
                        </div>
                        <button className={css["fourb-button"]} type="submit">Registrarse</button>
                    </form>
                </Modal> : null}
                {showLogin ? <Modal onClose={() => {
                    setShowLogin(false)
                }}>
                    <form onSubmit={async (e) => {
                        e.preventDefault()
                        logIn.mutate({ email: loginForm.email, password: loginForm.password });
                    }} className={css["auth-form"]}>
                        <span className={css["close"]}>x</span>
                        <h2 className={css["title"]}>Iniciar sesión</h2>
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
                </Modal> : null}
            </div>
            <div className={css["fourb-header"]}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        router.push('/search?search=' + input)
                    }}
                >
                    <input name="search" placeholder="Busqueda..." value={input} onChange={e => {
                        setInput(e.target.value)
                    }} />
                </form>
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