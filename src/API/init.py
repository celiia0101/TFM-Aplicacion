import pandas as pd
import numpy as np
import joblib

from sklearn.cluster import MiniBatchKMeans

df = pd.read_csv(r'C:\Users\celia\Desktop\TFM-Aplicacion\src\API\src\data\data_encuesta.csv', sep=';')

# Se elimina la variable del identificador de usuario
df = df.drop("user_id", axis=1)

# Se calcula la media y la multivarianza de los datos para posteriormente pasarselo al modelo de generación de variables sintéticas
mean = df.mean()
cov = df.cov()

rng = np.random.default_rng(seed=42)

sintectico = rng.multivariate_normal(mean, cov, size = 1500)
#Se crea un nuevo dataset con todos los datos sintéticos generados
df_sintectico = pd.DataFrame(sintectico, columns=df.columns)

# Se realizan una serie de transformaciones para que no haya decimales en las características
df_sintectico['time_minutes'] = round(df_sintectico['time_minutes'])
df_sintectico['total_time(minutes)'] = round(df_sintectico['total_time(minutes)'])

# Así como no puede haber negativos
df_sintectico = df_sintectico[(df_sintectico > 0).all(axis=1)]

# El tiempo debe ser superior a 10 minutos en ambas características
df_sintectico = df_sintectico[df_sintectico['total_time(minutes)'] >= 10]
df_sintectico = df_sintectico[df_sintectico['time_minutes'] >= 10]

# Y nunca el pomodoro debe ser mayor que el total de minutos utilizados para estudiar
df_sintectico = df_sintectico[df_sintectico['time_minutes'] < df_sintectico['total_time(minutes)']]

# Una vez realizado estas transformaciones se unen el anterior dataset con los datos de usuarios con el nuevo de datos sintéticos
df = pd.concat([df, df_sintectico])

df = df.sample(frac=1).reset_index(drop=True)

# Se entrena el algoritmo con todos los datos que se tienen actualmente
minikmeans_model = MiniBatchKMeans(
            n_clusters=4,
            init='k-means++',
            n_init=10,
            random_state=42
            )

minikmeans_model.fit(df.to_numpy())

print(minikmeans_model.cluster_centers_)

# Se guarda el modelo en un archivo binario
joblib.dump(minikmeans_model, r'C:\Users\celia\Desktop\TFM-Aplicacion\src\API\src\model\pomodoro.plk')


