package com.nexi.connectx.transformers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class XmlToJsonTransformer {

    private final XmlMapper xmlMapper = new XmlMapper();
    private final ObjectMapper objectMapper;

    public String transform(String xmlContent) throws Exception {
        JsonNode node = xmlMapper.readTree(xmlContent.getBytes());
        return objectMapper.writeValueAsString(node);
    }
}
