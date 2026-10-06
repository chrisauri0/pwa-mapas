
package mx.edu.uteq.mapa

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {

    @PluginMethod
    fun guardarRecorrido(call: PluginCall) {
        val destino = call.getString("destino")
        if (destino.isNullOrBlank()) {
            call.reject("Falta el destino")
            return
        }

        val pasos = call.getInt("pasos") ?: 0
        val distancia = call.getInt("distancia") ?: 0
        val simulado = call.getBoolean("simulado") ?: false
        val fecha = SimpleDateFormat("dd/MM HH:mm", Locale.forLanguageTag("es-MX")).format(Date())

        context.getSharedPreferences(UltimoRecorridoWidget.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString("destino", destino)
            .putInt("pasos", pasos)
            .putInt("distancia", distancia)
            .putBoolean("simulado", simulado)
            .putString("fecha", fecha)
            .apply()

        // Pedimos actualizar todos los widgets que el usuario tenga puestos
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, UltimoRecorridoWidget::class.java))
        UltimoRecorridoWidget.actualizarTodos(context, manager, ids)

        val ret = JSObject()
        ret.put("widgetsActualizados", ids.size)
        call.resolve(ret)
    }
}
