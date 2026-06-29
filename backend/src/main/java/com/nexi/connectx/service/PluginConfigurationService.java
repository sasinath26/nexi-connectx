package com.nexi.connectx.service;

import com.nexi.connectx.model.PluginConfiguration;
import com.nexi.connectx.repository.PluginConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PluginConfigurationService {

    private final PluginConfigurationRepository repository;

    public List<PluginConfiguration> findAll() {
        return repository.findAll();
    }

    @Transactional
    public PluginConfiguration update(Long id, String value) {
        PluginConfiguration config = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Configuration not found: " + id));
        config.setConfigValue(value);
        return repository.save(config);
    }
}
