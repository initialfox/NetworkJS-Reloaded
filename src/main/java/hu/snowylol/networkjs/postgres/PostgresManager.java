package hu.snowylol.networkjs.postgres;

import com.google.gson.Gson;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import hu.snowylol.networkjs.NetworkJS;
import net.neoforged.fml.loading.FMLPaths;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public final class PostgresManager {
    private static final Gson GSON = new Gson();
    private static final Path CONFIG_PATH = FMLPaths.GAMEDIR.get().resolve("kubejs/config/networkjs/postgres.json");

    private static HikariDataSource dataSource;
    private static PostgresConfig config;
    private static boolean initialized;

    private PostgresManager() {}

    public static Path getConfigPath() {
        return CONFIG_PATH;
    }

    public static boolean isEnabled() {
        return initialized && dataSource != null && !dataSource.isClosed();
    }

    public static PostgresConfig getConfig() {
        return config;
    }

    public static synchronized void tryInit() {
        shutdown();

        if (!Files.exists(CONFIG_PATH)) {
            NetworkJS.LOGGER.info("PostgreSQL config not found at {} — database bindings disabled", CONFIG_PATH);
            initialized = false;
            return;
        }

        try {
            String json = Files.readString(CONFIG_PATH);
            config = GSON.fromJson(json, PostgresConfig.class);

            if (config == null || !config.enabled) {
                NetworkJS.LOGGER.info("PostgreSQL disabled in config");
                initialized = false;
                return;
            }

            HikariConfig poolConfig = new HikariConfig();
            poolConfig.setJdbcUrl(config.jdbcUrl());
            poolConfig.setUsername(config.username);
            poolConfig.setPassword(config.password);
            poolConfig.setMaximumPoolSize(Math.max(1, config.maxPoolSize));
            poolConfig.setConnectionTimeout(Math.max(1000, config.connectionTimeoutMs));
            poolConfig.setPoolName("NetworkJS-PostgreSQL");
            poolConfig.setDriverClassName("hu.snowylol.networkjs.libs.postgresql.Driver");

            dataSource = new HikariDataSource(poolConfig);

            try (Connection connection = dataSource.getConnection()) {
                if (!connection.isValid(5)) {
                    throw new SQLException("Connection test failed");
                }
            }

            initialized = true;
            NetworkJS.LOGGER.info("PostgreSQL connected: {}:{}/{}", config.host, config.port, config.database);
        } catch (Exception e) {
            initialized = false;
            config = null;
            if (dataSource != null) {
                dataSource.close();
                dataSource = null;
            }
            NetworkJS.LOGGER.error("Failed to initialize PostgreSQL from {}", CONFIG_PATH, e);
        }
    }

    public static synchronized void shutdown() {
        initialized = false;
        if (dataSource != null) {
            try {
                dataSource.close();
            } catch (Exception e) {
                NetworkJS.LOGGER.warn("Error closing PostgreSQL pool", e);
            }
            dataSource = null;
        }
    }

    public static synchronized void reload() {
        tryInit();
    }

    public static CompletableFuture<PostgresQueryResult> queryAsync(String sql, List<Object> params) {
        return CompletableFuture.supplyAsync(() -> query(sql, params));
    }

    public static CompletableFuture<PostgresQueryResult> executeAsync(String sql, List<Object> params) {
        return CompletableFuture.supplyAsync(() -> execute(sql, params));
    }

    public static PostgresQueryResult query(String sql, List<Object> params) {
        requireReady();

        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = prepare(connection, sql, params);
             ResultSet resultSet = statement.executeQuery()) {

            List<Map<String, Object>> rows = new ArrayList<>();
            while (resultSet.next()) {
                rows.add(readRow(resultSet));
            }
            return PostgresQueryResult.ok(rows);
        } catch (Exception e) {
            NetworkJS.LOGGER.error("PostgreSQL query failed: {}", sql, e);
            return PostgresQueryResult.fail(e.getMessage());
        }
    }

    public static PostgresQueryResult execute(String sql, List<Object> params) {
        requireReady();

        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = prepare(connection, sql, params)) {

            int count = statement.executeUpdate();
            return PostgresQueryResult.okUpdate(count);
        } catch (Exception e) {
            NetworkJS.LOGGER.error("PostgreSQL execute failed: {}", sql, e);
            return PostgresQueryResult.fail(e.getMessage());
        }
    }

    private static void requireReady() {
        if (!NetworkJS.isRegistryEnabled()) {
            throw new RuntimeException("NetworkJS registry is disabled! Use /networkjs enable first.");
        }
        if (!isEnabled()) {
            throw new RuntimeException(
                    "PostgreSQL is not connected. Create " + CONFIG_PATH + " with \"enabled\": true and run /networkjs postgres reload"
            );
        }
    }

    private static PreparedStatement prepare(Connection connection, String sql, List<Object> params) throws SQLException {
        PreparedStatement statement = connection.prepareStatement(sql);
        for (int i = 0; i < params.size(); i++) {
            statement.setObject(i + 1, params.get(i));
        }
        return statement;
    }

    private static Map<String, Object> readRow(ResultSet resultSet) throws SQLException {
        ResultSetMetaData meta = resultSet.getMetaData();
        Map<String, Object> row = new LinkedHashMap<>();

        for (int i = 1; i <= meta.getColumnCount(); i++) {
            String column = meta.getColumnLabel(i);
            Object value = resultSet.getObject(i);

            if (value instanceof Timestamp timestamp) {
                value = timestamp.toInstant().toString();
            }

            row.put(column, value);
        }

        return row;
    }
}
