import { FC } from "react"

export const Shipments: FC = () => {
    return <div style={{ margin: '0px auto', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: '20px', padding: '0px 30px' }}>
        <h1 style={{ margin: 'auto' }}>Envíos</h1>
        <p><strong>Tiempo de envio</strong></p>
        <p>
            El tiempo de entrega es de 3 a 5 días hábiles(lunes-viernes). Enviamos con DHL Express.

            El tiempo de entrega podría variar por alta demanda o zona extendida.
        </p>
        <p><strong>Costo de envío</strong></p>
        <p>
            Nuestro envío es de $119 pesos a todo México y tenemos envío gratis a partir de $599.00
        </p>
        <p><strong>Cuál es el proceso de envío</strong></p>
        <p>
            Te enviaremos un correo electrónico con la confirmación de tu pedido, después de que tengamos preparado tu pedido te enviaremos un correo con la información de tu envío y el enlace para poder rastrear tu pedido y por último la empresa encargada del envío (DHL/Treggo para CDMX) se podrá poner en contacto contigo vía E-mail o por teléfono para darte más detalles de tu entrega.

            Si deseas que tu paquete llegue a sucursal por favor avisanos antes de realizar tu pedido, te asesoraremos con dirección, tiempos de envío, etc.
        </p>
    </div>
}

export default Shipments