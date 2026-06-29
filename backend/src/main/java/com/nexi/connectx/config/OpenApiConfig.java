package com.nexi.connectx.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI nexiConnectXOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Nexi ConnectX API")
                        .description("Enterprise integration and workflow orchestration POC")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Nexi ConnectX")
                                .email("support@nexiconnectx.com")));
    }
}
