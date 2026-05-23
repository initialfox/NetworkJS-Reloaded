package hu.snowylol.networkjs;

import com.mojang.brigadier.CommandDispatcher;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import hu.snowylol.networkjs.postgres.PostgresManager;

public class NetworkJSCommand {
    
    public static void register(CommandDispatcher<CommandSourceStack> dispatcher) {
        dispatcher.register(Commands.literal("networkjs")
            .requires(source -> source.hasPermission(2)) // Requires op level 2
            .then(Commands.literal("enable")
                .executes(context -> {
                    CommandSourceStack source = context.getSource();
                    if (NetworkJS.isRegistryEnabled()) {
                        source.sendFailure(Component.literal("NetworkJS registry is already enabled!"));
                        return 0;
                    }
                    
                    NetworkJS.enableRegistry();
                    source.sendSuccess(() -> Component.literal("NetworkJS registry enabled successfully!"), true);
                    return 1;
                }))
            .then(Commands.literal("disable")
                .executes(context -> {
                    CommandSourceStack source = context.getSource();
                    if (!NetworkJS.isRegistryEnabled()) {
                        source.sendFailure(Component.literal("NetworkJS registry is already disabled!"));
                        return 0;
                    }
                    
                    NetworkJS.disableRegistry();
                    source.sendSuccess(() -> Component.literal("NetworkJS registry disabled!"), true);
                    return 1;
                }))
            .then(Commands.literal("reload")
                .executes(context -> {
                    CommandSourceStack source = context.getSource();
                    if (!NetworkJS.isRegistryEnabled()) {
                        source.sendFailure(Component.literal("NetworkJS registry is disabled! Enable it first with /networkjs enable"));
                        return 0;
                    }
                    
                    NetworkJS.forceReloadBindings();
                    source.sendSuccess(() -> Component.literal("NetworkJS bindings reload requested!"), true);
                    return 1;
                }))
            .then(Commands.literal("status")
                .executes(context -> {
                    CommandSourceStack source = context.getSource();
                    boolean enabled = NetworkJS.isRegistryEnabled();
                    String registryStatus = enabled ? "enabled" : "disabled";
                    String postgresStatus = PostgresManager.isEnabled() ? "connected" : "disconnected";

                    source.sendSuccess(() -> Component.literal(
                            "[NetworkJS] Registry: " + registryStatus + ", PostgreSQL: " + postgresStatus
                    ), false);
                    return 1;
                }))
            .then(Commands.literal("postgres")
                .then(Commands.literal("reload")
                    .executes(context -> {
                        CommandSourceStack source = context.getSource();
                        PostgresManager.reload();
                        String msg = PostgresManager.isEnabled()
                                ? "PostgreSQL reloaded and connected."
                                : "PostgreSQL reload finished (not connected — check kubejs/config/networkjs/postgres.json).";
                        source.sendSuccess(() -> Component.literal(msg), true);
                        return 1;
                    }))
                .then(Commands.literal("status")
                    .executes(context -> {
                        CommandSourceStack source = context.getSource();
                        if (PostgresManager.isEnabled()) {
                            var cfg = PostgresManager.getConfig();
                            source.sendSuccess(() -> Component.literal(
                                    "PostgreSQL OK: " + cfg.host + ":" + cfg.port + "/" + cfg.database
                            ), false);
                        } else {
                            source.sendFailure(Component.literal(
                                    "PostgreSQL not connected. Config: " + PostgresManager.getConfigPath()
                            ));
                        }
                        return 1;
                    })))
        );
    }
}
