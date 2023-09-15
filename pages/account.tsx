import { useState } from "react"
import { trpc } from "../utils/config"
import Head from "next/head"

export default function Account() {
    const [form, setForm] = useState({
        name: '',
        apellidos: '',
        email: '',
        phonePrefix: '+52' as const,
        phone: '',
    })
    trpc.getUser.useQuery(undefined, {
        onSuccess: (values) => {
            setForm({
                name: values.name,
                apellidos: values.apellidos,
                email: values.email,
                phonePrefix: '+52',
                phone: values.phone
            })
        }
    })
    const editUser = trpc.editUser.useMutation({
        onSuccess: () => {
            alert('Usuario actualizado exitosamente!')
        }
    })
    const setFormByName = (name: string, value: string) => {
        setForm(state => ({ ...state, [name]: value }))
    }
    return <div>
        <Head>
            <title>Cuenta - FourB</title>
        </Head>
        <h2 className="title">Cuenta</h2>
        <form onSubmit={(e) => {
            e.preventDefault()
            editUser.mutate({
                name: form.name,
                apellidos: form.apellidos,
                email: form.email,
                phone: form.phone,
                phonePrefix: form.phonePrefix,
            })
        }}>
            <div className="input-container">
                <label htmlFor="name">Nombre</label>
                <input id="name" type="text" name="name" required value={form.name} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container">
                <label htmlFor="apellidos">Apellidos</label>
                <input id="apellidos" type="text" name="apellidos" required value={form.apellidos} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                <label htmlFor="email">Email</label>
                <input id="email" type="text" name="email" required value={form.email} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container">
                <label htmlFor="text">Teléfono</label>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    <select id="phonePrefix" name="phonePrefix" required value={form.phonePrefix} onChange={(e) => {
                        setFormByName(e.target.name, e.target.value)
                    }}>
                        <option value="+52">🇲🇽 Mexico (+52)</option>
                    </select>
                    <input id="phone" type="text" name="phone" required style={{ flex: 1 }} value={form.phone} onChange={(e) => {
                        setFormByName(e.target.name, e.target.value)
                    }} />
                </div>
            </div>
            <button className="fourb-button" type="submit">Actualizar</button>
        </form>
    </div>
}