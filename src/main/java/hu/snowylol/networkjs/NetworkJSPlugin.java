package hu.snowylol.networkjs;

import dev.latvian.mods.kubejs.plugin.KubeJSPlugin;
import dev.latvian.mods.kubejs.script.BindingRegistry;
import hu.snowylol.networkjs.FetchBinding.FetchOptions;
import hu.snowylol.networkjs.postgres.PostgresBinding;
import hu.snowylol.networkjs.postgres.PostgresJSFunction;
import hu.snowylol.networkjs.postgres.PostgresQueryResult;

public class NetworkJSPlugin implements KubeJSPlugin {

    @Override
    public void registerBindings(BindingRegistry bindings) {
        NetworkJS.LOGGER.info("Registering NetworkJS bindings...");

        bindings.add("fetch", new FetchJSFunction(false));
        bindings.add("fetchAsync", new FetchJSFunction(true));

        bindings.add("FetchBinding", FetchBinding.class);
        bindings.add("FetchOptions", FetchOptions.class);
        bindings.add("FetchResponse", FetchBinding.FetchResponse.class);
        bindings.add("DiscordBot", DiscordBinding.class);
        bindings.add("Server", ServerBinding.class);

        bindings.add("postgresQuery", new PostgresJSFunction(false));
        bindings.add("postgresExecute", new PostgresJSFunction(true));
        bindings.add("Postgres", PostgresBinding.class);
        bindings.add("PostgresResult", PostgresQueryResult.class);

        NetworkJS.LOGGER.info("NetworkJS bindings registered successfully");
    }
}
