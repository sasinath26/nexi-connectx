package com.nexi.connectx.service;

import lombok.RequiredArgsConstructor;
import org.apache.camel.CamelContext;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RouteControlService {

    private final CamelContext camelContext;

    public void startRoute(String routeId) throws Exception {
        camelContext.getRouteController().startRoute(routeId);
    }

    public void stopRoute(String routeId) throws Exception {
        camelContext.getRouteController().stopRoute(routeId);
    }

    public String getRouteStatus(String routeId) {
        return camelContext.getRouteController().getRouteStatus(routeId).name();
    }
}
