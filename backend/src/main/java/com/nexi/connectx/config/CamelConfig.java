package com.nexi.connectx.config;

import org.apache.camel.CamelContext;
import org.apache.camel.spring.boot.CamelContextConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CamelConfig {

    @Bean
    public CamelContextConfiguration camelContextConfiguration() {
        return new CamelContextConfiguration() {
            @Override
            public void beforeApplicationStart(CamelContext camelContext) {
                camelContext.setUseMDCLogging(true);
                camelContext.setMessageHistory(true);
            }

            @Override
            public void afterApplicationStart(CamelContext camelContext) {
                // no-op
            }
        };
    }
}
