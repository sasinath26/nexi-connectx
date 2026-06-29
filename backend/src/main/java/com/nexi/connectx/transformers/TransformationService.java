package com.nexi.connectx.transformers;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TransformationService {

    private final CsvToJsonTransformer csvToJsonTransformer;
    private final XmlToJsonTransformer xmlToJsonTransformer;
    private final JsonMappingTransformer jsonMappingTransformer;
    private final DataEnrichmentProcessor dataEnrichmentProcessor;

    public String transform(String content, String format) throws Exception {
        String json = switch (format.toUpperCase()) {
            case "CSV" -> csvToJsonTransformer.transform(content);
            case "XML" -> xmlToJsonTransformer.transform(content);
            case "JSON" -> jsonMappingTransformer.normalize(content);
            default -> throw new IllegalArgumentException("Unsupported format: " + format);
        };
        return dataEnrichmentProcessor.enrich(json);
    }
}
