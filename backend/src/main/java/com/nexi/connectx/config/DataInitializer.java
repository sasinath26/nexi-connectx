package com.nexi.connectx.config;

import com.nexi.connectx.model.PluginConfiguration;
import com.nexi.connectx.repository.PluginConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final PluginConfigurationRepository pluginConfigurationRepository;
    private final NexiConnectXProperties properties;

    @Override
    public void run(String... args) {
        seedIfAbsent("kafka.consumer.topic", properties.getKafka().getConsumerTopic(), "KAFKA");
        seedIfAbsent("kafka.producer.topic", properties.getKafka().getProducerTopic(), "KAFKA");
        seedIfAbsent("kafka.dlq.topic", properties.getKafka().getDlqTopic(), "KAFKA");
        seedIfAbsent("file.input.dir", properties.getFile().getInputDir(), "FILE");
        seedIfAbsent("file.processed.dir", properties.getFile().getProcessedDir(), "FILE");
        seedIfAbsent("rest.external.api.url", properties.getRest().getExternalApiUrl(), "REST");
        seedIfAbsent("notification.email.to", properties.getNotification().getEmail().getTo(), "EMAIL");
    }

    private void seedIfAbsent(String key, String value, String category) {
        if (pluginConfigurationRepository.findByConfigKey(key).isEmpty()) {
            PluginConfiguration config = PluginConfiguration.builder()
                    .configKey(key)
                    .configValue(value)
                    .category(category)
                    .description("Default " + key)
                    .build();
            pluginConfigurationRepository.save(config);
        }
    }
}
