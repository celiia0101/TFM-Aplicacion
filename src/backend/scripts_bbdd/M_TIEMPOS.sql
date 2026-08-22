CREATE TABLE adaptivepomodoro.M_TIEMPOS (
	-- Clave propia en vez de (ID_USER, FECHA): FECHA solo tiene precisión de
	-- segundo, así que dos sesiones registradas en el mismo segundo para el
	-- mismo usuario chocaban con "Duplicate entry" y la sesión se perdía.
	ID_TIEMPO				INT				AUTO_INCREMENT PRIMARY KEY,
	ID_USER 				INT				NOT NULL,
    FECHA					DATETIME		NOT NULL,
    TIEMPO_TRABAJO			INT				NOT NULL,
    TIEMPO_DESCANSO			INT				NOT NULL DEFAULT 0,

	INDEX IDX_M_TIEMPOS_USER_FECHA (ID_USER, FECHA),
	CONSTRAINT FK_M_TIEMPOS_L_USUARIOS
        FOREIGN KEY (ID_USER)
        REFERENCES adaptivepomodoro.L_USUARIOS (ID_USER)
        ON UPDATE CASCADE
        ON DELETE CASCADE

);
