import { connect } from "../databases";
import jwt from 'jsonwebtoken';
const secreto = process.env.SECRET_KEY;

export const logIn = async (req, res) => {
  try {
    const { dni, password } = req.body;
    const cnn = await connect();

    const q = "SELECT password FROM alumno WHERE dni=?";
    const parametros = [dni];

    const [row] = await cnn.query(q, parametros);
    if (row.length === 0)
      return res.status(400).json({ success: false, message: "usuario no existe" });

    if (password === row[0].password) {
      const token = getToken({ sub: dni });
      return res.status(200).json({ success: true, message: "login ok", token: token });
    } else {
      return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
    }
  } catch (error) {
    console.log("error de login", error.message);
    return res.status(500).json({ message: "error", error: error });
  }
};

const userExist = async (cnn, tabla, atributo, valor) => {
  try {
    const [row] = await cnn.query(`SELECT * FROM ${tabla} WHERE ${atributo}=?`, [valor]);
    return row.length > 0;
  } catch (error) {
    console.log("userExist", error);
  }
};

export const createUsers = async (req, res) => {
  try {
    const cnn = await connect();
    const { nombre, dni, correo, password } = req.body;

    const dniExist = await userExist(cnn, "alumno", "dni", dni);
    const correoExist = await userExist(cnn, "alumno", "correo", correo);

    if (dniExist || correoExist) {
      return res.json({ message: "ya existe el usuario" });
    } else {
      const [row] = await cnn.query("INSERT INTO alumno( nombre, dni, correo, password ) values ( ?, ?, ?, ?)", [nombre, dni, correo, password]);

      if (row.affectedRows === 1) {
        res.json({ message: "se creo el alumno con exito", success: true });
      } else {
        return res.status(500).json({ message: "no se creo el usuario" });
      }
    }
  } catch (error) {
    console.log("create user", error);
    res.json({ message: "No se pudo conectar con la base de datos", success: false });
  }
};

export const publico = (req, res) => {};

export const privado = (req, res) => {
  //validar el token
};

export const getToken = (payload) => { 
  try {
    const token = jwt.sign(payload, secreto, { expiresIn: "15m" });
    return token; 
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const getData = (req, res) => {
  const user = req.user;
  const materias = [
    { id: 10, nombre: "web dinamica" },
    { id: 12, nombre: "so" },
    { id: 15, nombre: "arquitectura" },
  ];
  return res.status(200).json({ materias: materias, usuario: user });
};

export const auth = (req, res, next) => {
  const token = req.headers['mani'];

  if (!token) return res.status(400).json({ message: "sin token" });

  jwt.verify(token, secreto, (error, user) => {
    if (error) {
      return res.status(400).json({ message: "token invalido" });
    } else {
      req.user = user;
      next();
    }
  });
};

// Nueva función: Agregar materia
export const addMateria = async (req, res) => {
  try {
    const { nombre_materia } = req.body; // Cambio aquí
    const cnn = await connect();
    const [row] = await cnn.query("INSERT INTO materia (nombre_materia) VALUES (?)", [nombre_materia]); // Cambio aquí

    if (row.affectedRows === 1) {
      res.json({ message: "Materia agregada con éxito", success: true });
    } else {
      return res.status(500).json({ message: "No se pudo agregar la materia" });
    }
  } catch (error) {
    console.log("addMateria", error);
    res.status(500).json({ message: "Error en el servidor", success: false });
  }
};


// Nueva función: Relacionar usuario con materia
export const cursar = async (req, res) => {
  try {
    const { dni, idMateria } = req.body;
    const cnn = await connect();
    const [row] = await cnn.query("INSERT INTO cursar (dni, id_m) VALUES (?, ?)", [dni, idMateria]);

    if (row.affectedRows === 1) {
      res.json({ message: "Materia asignada al alumno con éxito", success: true });
    } else {
      return res.status(500).json({ message: "No se pudo asignar la materia" });
    }
  } catch (error) {
    console.log("cursar", error);
    res.status(500).json({ message: "Error en el servidor", success: false });
  }
};

// Nueva función: Obtener materias de un alumno por ID
export const getMateriaById = async (req, res) => {
  try {
    const { dni } = req.params;
    const cnn = await connect();

    // Modificar la consulta para que use los nombres de columna correctos
    const [rows] = await cnn.query(
      "SELECT m.id_m, m.nombre_materia FROM materia m JOIN cursar c ON m.id_m = c.id_m WHERE c.dni = ?",
      [dni]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No se encontraron materias para el alumno" });
    }

    return res.status(200).json({ success: true, materias: rows });
  } catch (error) {
    console.log("getMateriaById", error);
    return res.status(500).json({ message: "Error en el servidor", error: error });
  }
};

