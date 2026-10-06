
package mx.edu.uteq.mapa

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class UltimoRecorridoWidget : AppWidgetProvider() {

    // Android lo llama al agregar el widget y en cada actualización periódica
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        actualizarTodos(context, appWidgetManager, appWidgetIds)
    }

    companion object {
        const val PREFS = "uteq_widget"

        fun actualizarTodos(context: Context, manager: AppWidgetManager, ids: IntArray) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val destino = prefs.getString("destino", null)
            val pasos = prefs.getInt("pasos", 0)
            val distancia = prefs.getInt("distancia", 0)
            val simulado = prefs.getBoolean("simulado", false)
            val fecha = prefs.getString("fecha", "") ?: ""

            // Al tocar el widget se abre la app
            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

            for (id in ids) {
                val views = RemoteViews(context.packageName, R.layout.widget_ultimo_recorrido)

                if (destino == null) {
                    views.setTextViewText(R.id.widget_destino, "Sin recorridos aún")
                    views.setTextViewText(R.id.widget_detalle, "Toca para abrir el mapa")
                    views.setTextViewText(R.id.widget_fecha, "")
                } else {
                    val estimado = if (simulado) " (est.)" else ""
                    views.setTextViewText(R.id.widget_destino, destino)
                    views.setTextViewText(R.id.widget_detalle, "👟 $pasos pasos$estimado · $distancia m")
                    views.setTextViewText(R.id.widget_fecha, fecha)
                }

                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
                manager.updateAppWidget(id, views)
            }
        }
    }
}
