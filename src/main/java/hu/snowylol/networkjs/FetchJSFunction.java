package hu.snowylol.networkjs;

import dev.latvian.mods.rhino.BaseFunction;
import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.Scriptable;
import dev.latvian.mods.rhino.Wrapper;
import hu.snowylol.networkjs.FetchBinding.FetchOptions;

import java.util.Map;

public class FetchJSFunction extends BaseFunction {
    private final boolean async;

    public FetchJSFunction(boolean async) {
        this.async = async;
    }

    @Override
    public Object call(Context cx, Scriptable scope, Scriptable thisObj, Object[] args) {
        if (args.length < 1) {
            throw new RuntimeException((async ? "fetchAsync" : "fetch") + " requires a URL");
        }
        if (!NetworkJS.isRegistryEnabled()) {
            throw new RuntimeException("NetworkJS registry is disabled! Use /networkjs enable to enable fetch functionality.");
        }

        String url = String.valueOf(Wrapper.unwrapped(args[0]));
        FetchOptions options = parseOptions(args.length > 1 ? Wrapper.unwrapped(args[1]) : null);

        if (async) {
            return options != null ? FetchBinding.fetchAsync(url, options) : FetchBinding.fetchAsync(url);
        }
        return options != null ? FetchBinding.fetch(url, options) : FetchBinding.fetch(url);
    }

    @SuppressWarnings("unchecked")
    private static FetchOptions parseOptions(Object optionsArg) {
        if (optionsArg == null) {
            return null;
        }
        if (optionsArg instanceof Map<?, ?> opts) {
            Map<String, Object> optMap = (Map<String, Object>) opts;
            return new FetchOptions(
                    (String) optMap.getOrDefault("method", "GET"),
                    (Map<String, String>) optMap.getOrDefault("headers", Map.of()),
                    optMap.getOrDefault("body", null)
            );
        }
        return null;
    }
}
