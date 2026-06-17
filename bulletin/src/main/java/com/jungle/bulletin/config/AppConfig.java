package com.jungle.bulletin.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration  // 이 클래스가 Bean 설정을 담당함을 Spring에 알림
public class AppConfig {

    @Bean  // RestTemplate을 Spring 컨테이너에 등록 → 어디서든 주입 가능
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
