package hu.snowylol.networkjs.postgres;

import dev.latvian.mods.rhino.BaseFunction;
import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.Scriptable;
import dev.latvian.mods.rhino.Wrapper;

import java.util.List;

public class PostgresJSFunction extends BaseFunction {
    private final boolean execute;

    public PostgresJSFunction(boolean execute) {
        this.execute = execute;
    }

    @Override
    public Object call(Context cx, Scriptable scope, Scriptable thisObj, Object[] args) {
        if (args.length < 1) {
            throw new RuntimeException((execute ? "postgresExecute" : "postgresQuery") + " requires SQL");
        }

        String sql = String.valueOf(Wrapper.unwrapped(args[0]));
        List<Object> params = PostgresParamUtils.normalize(cx, args.length > 1 ? args[1] : null);

        if (execute) {
            return PostgresBinding.executeAsync(sql, params);
        }
        return PostgresBinding.queryAsync(sql, params);
    }
}
