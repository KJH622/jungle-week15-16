package com.jungle.bulletin.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration          // Spring 설정 클래스임을 표시
@EnableWebSecurity      // Spring Security 활성화
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService customUserDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())           // REST API는 CSRF 불필요
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // 세션 사용 안 함 (JWT 방식)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()              // 회원가입/로그인은 누구나
                        .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()   // 게시글 조회는 누구나
                        .requestMatchers(HttpMethod.POST, "/api/posts/*/improve").permitAll() // 개선 제안은 누구나
                        .requestMatchers(HttpMethod.GET, "/api/categories", "/api/categories/**").permitAll() // 카테고리 목록 조회는 누구나
                        .anyRequest().authenticated()                             // 나머지는 JWT 필요
                )
                // JwtFilter를 UsernamePasswordAuthenticationFilter 앞에 끼워 넣음
                .addFilterBefore(
                        new JwtFilter(jwtUtil, customUserDetailsService),
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // 비밀번호 암호화 도구 Bean 등록
    }
}