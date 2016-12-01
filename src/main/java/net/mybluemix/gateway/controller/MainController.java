package net.mybluemix.gateway.controller;

import net.mybluemix.gateway.dao.DAOFactory;
import net.mybluemix.gateway.dao.LevelDAO;
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
     * Play the game.
     * @return the name of the jsp to display
     */
	@RequestMapping("/play")
	public String play(HttpServletRequest request, Model model) {
		return "game";
	}

	/**
	 * Go to the home page.
	 * @return the name of the jsp to display
	 */
	@RequestMapping("")
	public String home(HttpServletRequest request, Model model) {
		System.out.println("home");
		//LevelDAO dao = DAOFactory.getLevelDAO(servletContext);
		//model.addAttribute("message", dao.getLevel("test", ""));
		model.addAttribute("message", "Hello");
		return "main";
	}

}