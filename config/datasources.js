const {
  DB_MONGO_PORT, 
  DB_MONGO_USERPASS,
  DB_MONGO_DBNAME,
  DB_MONGO_USER,
  DB_MONGO_HOST,

  STORAGE_FOLDER_ROOT
} = process.env

export const mongodb = {
    name: "mongodb",
    connector: "mongodb",
    host: DB_MONGO_HOST,
    port: DB_MONGO_PORT,
    database: DB_MONGO_DBNAME,
    user: DB_MONGO_USER,
    password: DB_MONGO_USERPASS
}

export const storage_container = {
  name: "storage_container",
  debug: true,
  connector: "loopback-component-storage",
  provider: "filesystem",
  root: STORAGE_FOLDER_ROOT
}
