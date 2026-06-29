package com.nexi.connectx.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "nexi.connectx")
public class NexiConnectXProperties {

    private FileConfig file = new FileConfig();
    private SftpConfig sftp = new SftpConfig();
    private KafkaConfig kafka = new KafkaConfig();
    private RestConfig rest = new RestConfig();
    private NotificationConfig notification = new NotificationConfig();
    private RetryConfig retry = new RetryConfig();

    @Data
    public static class FileConfig {
        private String inputDir = "./data/input";
        private String processedDir = "./data/processed";
        private String errorDir = "./data/error";
    }

    @Data
    public static class SftpConfig {
        private boolean enabled;
        private String host = "localhost";
        private int port = 22;
        private String username;
        private String password;
        private String remoteDir = "/incoming";
    }

    @Data
    public static class KafkaConfig {
        private String bootstrapServers = "localhost:9092";
        private String consumerTopic = "nexi-connectx-inbound";
        private String producerTopic = "nexi-connectx-outbound";
        private String dlqTopic = "nexi-connectx-dlq";
        private String groupId = "nexi-connectx-group";
    }

    @Data
    public static class RestConfig {
        private String externalApiUrl;
    }

    @Data
    public static class NotificationConfig {
        private EmailConfig email = new EmailConfig();
        private SlackConfig slack = new SlackConfig();

        @Data
        public static class EmailConfig {
            private boolean enabled;
            private String from;
            private String to;
        }

        @Data
        public static class SlackConfig {
            private boolean enabled;
            private String webhookUrl;
        }
    }

    @Data
    public static class RetryConfig {
        private int maxAttempts = 3;
        private long delayMs = 2000;
    }
}
