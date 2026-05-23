package hu.snowylol.networkjs.postgres;

public class PostgresConfig {
    public boolean enabled = false;
    public String host = "localhost";
    public int port = 5432;
    public String database = "minecraft";
    public String username = "postgres";
    public String password = "";
    public int maxPoolSize = 5;
    public int connectionTimeoutMs = 10000;

    public String jdbcUrl() {
        return "jdbc:postgresql://" + host + ":" + port + "/" + database;
    }
}
