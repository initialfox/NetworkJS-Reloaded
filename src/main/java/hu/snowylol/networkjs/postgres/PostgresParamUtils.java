package hu.snowylol.networkjs.postgres;

import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.NativeArray;
import dev.latvian.mods.rhino.Wrapper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class PostgresParamUtils {
    private PostgresParamUtils() {}

    public static List<Object> normalize(Context cx, Object params) {
        if (params == null) {
            return Collections.emptyList();
        }

        Object value = Wrapper.unwrapped(params);

        if (value instanceof List<?> list) {
            return new ArrayList<>(list);
        }
        if (value instanceof NativeArray nativeArray) {
            var result = new ArrayList<>();
            for (long i = 0; i < nativeArray.getLength(); i++) {
                result.add(Wrapper.unwrapped(nativeArray.get(i, cx)));
            }
            return result;
        }
        if (value != null && value.getClass().isArray()) {
            return Arrays.asList((Object[]) value);
        }

        return List.of(value);
    }
}
