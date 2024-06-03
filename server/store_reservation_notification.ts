export const storeReservationNotification = `
<table style="height:100%!important;width:100%!important;border-spacing:0;border-collapse:collapse">
    <tbody>
        <tr>
            <td
                style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif">
                <table style="width:100%;border-spacing:0;border-collapse:collapse">
                    <tbody>
                        <tr>
                            <td
                                style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding-bottom:40px;border-width:0">
                                <center>
                                    <table
                                        style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
                                        <tbody>
                                            <tr>
                                                <td
                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif">

                                                    <h2 style="font-weight:normal;font-size:24px;margin:0 0 10px">
                                                        ¡Reserva confirmada!
                                                    </h2>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </center>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <table style="width:100%;border-spacing:0;border-collapse:collapse">
                    <tbody>
                        <tr>
                            <td
                                style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding:40px 0">
                                <center>
                                    <table
                                        style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
                                        <tbody>
                                            <tr>
                                                <td
                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif">
                                                    <h3 style="font-weight:normal;font-size:20px;margin:0 0 25px">
                                                        Resumen del pedido</h3>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table
                                        style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
                                        <tbody>
                                            <tr>
                                                <td
                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif">
                                                    <table style="width:100%;border-spacing:0;border-collapse:collapse">
                                                        <tbody>
                                                            {{#productsList}}
                                                                <tr style="width:100%">
                                                                    <td
                                                                        style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding-bottom:15px">
                                                                        <table
                                                                            style="border-spacing:0;border-collapse:collapse">
                                                                            <tbody>
                                                                                <tr>
                                                                                    <td
                                                                                        style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif">
                                                                                        <img src="{{img}}"
                                                                                            align="left" width="60"
                                                                                            height="60"
                                                                                            style="margin-right:15px;border-radius:8px;border:1px solid #e5e5e5"
                                                                                            class="CToWUd" data-bit="iit">
                                                                                    </td>
                                                                                    <td
                                                                                        style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;width:100%">
                                                                                        <span
                                                                                            style="font-size:16px;font-weight:600;line-height:1.4;color:#555">
                                                                                            {{name}}&nbsp;×&nbsp;{{qty}}</span><br>
                                                                                    </td>
                                                                                    <td
                                                                                        style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;white-space:nowrap">
                                                                                        <p style="color:#555;line-height:150%;font-size:16px;font-weight:600;margin:4px 0 0 15px"
                                                                                            align="right">
                                                                                            {{total}}
                                                                                        </p>
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            {{/productsList}}
                                                        </tbody>
                                                    </table>
                                                    <table
                                                        style="width:100%;border-spacing:0;border-collapse:collapse;margin-top:15px;border-top-width:1px;border-top-color:#e5e5e5;border-top-style:solid">
                                                        <tbody>
                                                            <tr>
                                                                <td
                                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;width:40%">
                                                                </td>
                                                                <td
                                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif">
                                                                    <table
                                                                        style="width:100%;border-spacing:0;border-collapse:collapse;margin-top:20px">
                                                                        <tbody>
                                                                            <tr>
                                                                                <td
                                                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding:2px 0">
                                                                                    <p
                                                                                        style="color:#777;line-height:1.2em;font-size:16px;margin:4px 0 0">
                                                                                        <span
                                                                                            style="font-size:16px">Subtotal</span>
                                                                                    </p>
                                                                                </td>
                                                                                <td style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding:2px 0"
                                                                                    align="right">
                                                                                    <strong
                                                                                        style="font-size:16px;color:#555">{{subtotal}}</strong>
                                                                                </td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td
                                                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding:2px 0">
                                                                                    <p
                                                                                        style="color:#777;line-height:1.2em;font-size:16px;margin:4px 0 0">
                                                                                        <span
                                                                                            style="font-size:16px">Envíos</span>
                                                                                    </p>
                                                                                </td>
                                                                                <td style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding:2px 0"
                                                                                    align="right">
                                                                                    <strong
                                                                                        style="font-size:16px;color:#555">
                                                                                        {{shipment}}</strong>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                    <table
                                                                        style="width:100%;border-spacing:0;border-collapse:collapse;margin-top:20px;border-top-width:2px;border-top-color:#e5e5e5;border-top-style:solid">

                                                                        <tbody>
                                                                            <tr>
                                                                                <td
                                                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding:20px 0 0">
                                                                                    <p
                                                                                        style="color:#777;line-height:1.2em;font-size:16px;margin:4px 0 0">
                                                                                        <span
                                                                                            style="font-size:16px">Total</span>
                                                                                    </p>
                                                                                </td>
                                                                                <td style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding:20px 0 0"
                                                                                    align="right">
                                                                                    <strong
                                                                                        style="font-size:24px;color:#555">
                                                                                        {{total}}</strong>
                                                                                </td>
                                                                            </tr>

                                                                        </tbody>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </center>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <table style="width:100%;border-spacing:0;border-collapse:collapse">
                    <tbody>
                        <tr>
                            <td
                                style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding:40px 0">
                                <center>
                                    <table
                                        style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
                                        <tbody>
                                            <tr>
                                                <td
                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif">
                                                    <h3 style="font-weight:normal;font-size:20px;margin:0 0 25px">
                                                        Información del cliente</h3>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table
                                        style="width:560px;text-align:left;border-spacing:0;border-collapse:collapse;margin:0 auto">
                                        <tbody>
                                            <tr>
                                                <td
                                                    style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif">
                                                    <table style="width:100%;border-spacing:0;border-collapse:collapse">
                                                        <tbody>
                                                            <tr>
                                                                <td style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding-bottom:40px;width:50%"
                                                                    valign="top">
                                                                    <h4
                                                                        style="font-weight:500;font-size:16px;color:#555;margin:0 0 5px">
                                                                        Dirección de envío</h4>
                                                                    <p
                                                                        style="color:#777;line-height:150%;font-size:16px;margin:0">
                                                                        {{name}}
                                                                        <br>
                                                                        {{address}}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <table style="width:100%;border-spacing:0;border-collapse:collapse">
                                                        <tbody>
                                                            <tr>
                                                                <td style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding-bottom:40px;width:50%"
                                                                    valign="top">
                                                                    <h4
                                                                        style="font-weight:500;font-size:16px;color:#555;margin:0 0 5px">
                                                                        Método de envío</h4>
                                                                    <p
                                                                        style="color:#777;line-height:150%;font-size:16px;margin:0">
                                                                        {{shipmentMethod}}</p>
                                                                </td>
                                                                <td style="font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,&quot;Roboto&quot;,&quot;Oxygen&quot;,&quot;Ubuntu&quot;,&quot;Cantarell&quot;,&quot;Fira Sans&quot;,&quot;Droid Sans&quot;,&quot;Helvetica Neue&quot;,sans-serif;padding-bottom:40px;width:50%"
                                                                    valign="top">
                                                                    <h4
                                                                        style="font-weight:500;font-size:16px;color:#555;margin:0 0 5px">
                                                                        Métodos de pago</h4>
                                                                    <p
                                                                        style="color:#777;line-height:150%;font-size:16px;margin:0">
                                                                        {{paymentMethod}} </p>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </center>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    </tbody>
</table>
`