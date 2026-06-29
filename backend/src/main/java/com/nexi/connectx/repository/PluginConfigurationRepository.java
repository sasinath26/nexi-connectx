package com.nexi.connectx.repository;

import com.nexi.connectx.model.PluginConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PluginConfigurationRepository extends JpaRepository<PluginConfiguration, Long> {

    Optional<PluginConfiguration> findByConfigKey(String configKey);

    List<PluginConfiguration> findByCategory(String category);
}
