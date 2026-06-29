package com.nexi.connectx.processors;

import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.springframework.stereotype.Component;

@Component("formatDetectionProcessor")
public class FormatDetectionProcessor implements Processor {

    @Override
    public void process(Exchange exchange) {
        String fileName = exchange.getIn().getHeader(Exchange.FILE_NAME_ONLY, String.class);
        String body = exchange.getIn().getBody(String.class);
        String format = detectFormat(fileName, body);
        exchange.getIn().setHeader(WorkflowProcessor.HEADER_FORMAT, format);
    }

    private String detectFormat(String fileName, String body) {
        if (fileName != null) {
            String lower = fileName.toLowerCase();
            if (lower.endsWith(".csv")) return "CSV";
            if (lower.endsWith(".xml")) return "XML";
            if (lower.endsWith(".json")) return "JSON";
        }
        if (body != null) {
            String trimmed = body.trim();
            if (trimmed.startsWith("<")) return "XML";
            if (trimmed.startsWith("[") || trimmed.startsWith("{")) return "JSON";
            if (trimmed.contains(",")) return "CSV";
        }
        return "JSON";
    }
}
