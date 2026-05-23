package hu.snowylol.networkjs;

import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.ModContainer;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.neoforge.event.server.ServerStartingEvent;
import net.neoforged.neoforge.event.server.ServerStoppingEvent;
import hu.snowylol.networkjs.postgres.PostgresManager;

@Mod(NetworkJS.MODID)
public class NetworkJSNeoForge {
    public NetworkJSNeoForge(IEventBus modEventBus, ModContainer modContainer) {
        NetworkJS.init();

        var neoForgeBus = NeoForge.EVENT_BUS;
        neoForgeBus.addListener(this::onRegisterCommands);
        neoForgeBus.addListener(this::onServerStarting);
        neoForgeBus.addListener(this::onServerStopping);
    }
    
    private void onRegisterCommands(RegisterCommandsEvent event) {
        NetworkJSCommand.register(event.getDispatcher());
    }
    
    private void onServerStarting(ServerStartingEvent event) {
        NetworkJS.LOGGER.info("Server starting - NetworkJS ready");
        // Check for singleplayer and show warning after server is started
        NetworkJS.checkSingleplayerAndWarn();
        PostgresManager.tryInit();
    }
    
    private void onServerStopping(ServerStoppingEvent event) {
        PostgresManager.shutdown();
        NetworkJS.disableRegistry();
        NetworkJS.LOGGER.info("Server stopping - NetworkJS registry disabled");
    }
}
