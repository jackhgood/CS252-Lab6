package com.example.project.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;

/**
 * Basic controller for the main menu page.
 */
@Controller
@RequestMapping("")
public class MainController {

    @SuppressWarnings("SpringJavaAutowiringInspection")
	@Autowired
    ServletContext servletContext;

    /**
     * Displays the main menu page.
     * @return the name of the jsp to display
     */
	@RequestMapping("")
	public String home(HttpServletRequest request, Model model) {
		return "game";
	}

}