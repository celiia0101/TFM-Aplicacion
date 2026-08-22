-- M_POMODORO es un historial (no un valor único por usuario+ánimo): cada fila
-- es una foto del centroide del modelo de IA justo después de una sesión, para
-- poder mostrar la tendencia de duración personalizada a lo largo del tiempo.
CREATE TABLE adaptivepomodoro.M_POMODORO (
	ID_USER 				INT 			NOT NULL,
    ID_ESTADO				INT	            NOT NULL,
    FECHA					DATETIME		NOT NULL DEFAULT CURRENT_TIMESTAMP,
    POMODORO 			    DECIMAL(4,2)	NOT NULL,

    PRIMARY KEY (ID_USER, ID_ESTADO, FECHA),
	CONSTRAINT FK_M_POMODORO_L_USUARIOS
        FOREIGN KEY (ID_USER)
        REFERENCES adaptivepomodoro.L_USUARIOS (ID_USER)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT FK_M_POMODORO_L_ESTADO_ANIMO
        FOREIGN KEY (ID_ESTADO)
        REFERENCES adaptivepomodoro.L_ESTADO_ANIMO (ID_ESTADO)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
