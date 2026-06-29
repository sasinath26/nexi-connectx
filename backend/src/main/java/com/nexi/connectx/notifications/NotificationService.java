package com.nexi.connectx.notifications;

import com.nexi.connectx.config.NexiConnectXProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NexiConnectXProperties properties;
    private final JavaMailSender mailSender;
    private final RestTemplate restTemplate = new RestTemplate();

    public void sendSuccessNotification(String workflowId, String routeId) {
        String message = "Workflow " + workflowId + " completed successfully on route " + routeId;
        log.info(message);
        sendEmail("Nexi ConnectX - Workflow Success", message);
        sendSlack(message);
    }

    public void sendFailureNotification(String workflowId, String error) {
        String message = "Workflow " + workflowId + " failed: " + error;
        log.error(message);
        sendEmail("Nexi ConnectX - Workflow Failure", message);
        sendSlack(":x: " + message);
    }

    private void sendEmail(String subject, String body) {
        if (!properties.getNotification().getEmail().isEnabled()) {
            log.debug("Email notifications disabled");
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(properties.getNotification().getEmail().getFrom());
            message.setTo(properties.getNotification().getEmail().getTo());
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Failed to send email notification: {}", e.getMessage());
        }
    }

    private void sendSlack(String text) {
        if (!properties.getNotification().getSlack().isEnabled()) {
            return;
        }
        try {
            restTemplate.postForEntity(
                    properties.getNotification().getSlack().getWebhookUrl(),
                    Map.of("text", text),
                    String.class);
        } catch (Exception e) {
            log.warn("Failed to send Slack notification: {}", e.getMessage());
        }
    }
}
