package hu.snowylol.networkjs.postgres;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class PostgresQueryResult {
    private final boolean success;
    private final String error;
    private final List<Map<String, Object>> rows;
    private final int updateCount;

    private PostgresQueryResult(boolean success, String error, List<Map<String, Object>> rows, int updateCount) {
        this.success = success;
        this.error = error;
        this.rows = rows == null ? List.of() : List.copyOf(rows);
        this.updateCount = updateCount;
    }

    public static PostgresQueryResult ok(List<Map<String, Object>> rows) {
        return new PostgresQueryResult(true, null, rows, 0);
    }

    public static PostgresQueryResult okUpdate(int updateCount) {
        return new PostgresQueryResult(true, null, List.of(), updateCount);
    }

    public static PostgresQueryResult fail(String error) {
        return new PostgresQueryResult(false, error, new ArrayList<>(), 0);
    }

    public boolean isSuccess() {
        return success;
    }

    public boolean isOk() {
        return success;
    }

    public String getError() {
        return error;
    }

    public List<Map<String, Object>> getRows() {
        return rows;
    }

    public int getUpdateCount() {
        return updateCount;
    }

    public int getRowCount() {
        return rows.size();
    }
}
