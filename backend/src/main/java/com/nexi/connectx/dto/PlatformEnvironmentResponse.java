package com.nexi.connectx.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformEnvironmentResponse {

    /** Display label: DEV, QA, STAGE, PROD */
    private String environment;

    /** Spring active profile value, e.g. stage */
    private String profile;

    /** True when running in production profile */
    private boolean production;

    /** Optional: restrict destructive actions in production */
    private boolean readonly;
}
