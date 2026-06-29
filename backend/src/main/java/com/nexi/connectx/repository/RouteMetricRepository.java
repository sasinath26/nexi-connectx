package com.nexi.connectx.repository;

import com.nexi.connectx.model.RouteMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RouteMetricRepository extends JpaRepository<RouteMetric, Long> {

    Optional<RouteMetric> findByRouteId(String routeId);
}
