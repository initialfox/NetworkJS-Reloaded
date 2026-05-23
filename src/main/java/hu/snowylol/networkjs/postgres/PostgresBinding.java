package hu.snowylol.networkjs.postgres;

import java.util.List;
import java.util.concurrent.CompletableFuture;

public final class PostgresBinding {
    private PostgresBinding() {}

    public static boolean isConnected() {
        return PostgresManager.isEnabled();
    }

    public static void reload() {
        PostgresManager.reload();
    }

    public static PostgresQueryResult query(String sql, List<Object> params) {
        return PostgresManager.query(sql, params == null ? List.of() : params);
    }

    public static PostgresQueryResult query(String sql) {
        return query(sql, List.of());
    }

    public static PostgresQueryResult execute(String sql, List<Object> params) {
        return PostgresManager.execute(sql, params == null ? List.of() : params);
    }

    public static PostgresQueryResult execute(String sql) {
        return execute(sql, List.of());
    }

    public static CompletableFuture<PostgresQueryResult> queryAsync(String sql, List<Object> params) {
        return PostgresManager.queryAsync(sql, params == null ? List.of() : params);
    }

    public static CompletableFuture<PostgresQueryResult> queryAsync(String sql) {
        return queryAsync(sql, List.of());
    }

    public static CompletableFuture<PostgresQueryResult> executeAsync(String sql, List<Object> params) {
        return PostgresManager.executeAsync(sql, params == null ? List.of() : params);
    }

    public static CompletableFuture<PostgresQueryResult> executeAsync(String sql) {
        return executeAsync(sql, List.of());
    }
}
